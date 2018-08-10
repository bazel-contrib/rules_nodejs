// Package analyze uses bazel query to determine and locate missing imports
// in TypeScript source files.
package analyze

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/bazelbuild/buildtools/edit"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/platform"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/workspace"
	"github.com/golang/protobuf/proto"

	appb "github.com/bazelbuild/buildtools/build_proto"
	arpb "github.com/bazelbuild/rules_typescript/ts_auto_deps/proto"
)

var (
	extensions = []string{
		// '.d.ts' must come before '.ts' to completely remove the '.d.ts'
		// extension.
		".d.ts",
		".ts",
		".tsx",
	}
)

// TargetLoader provides methods for loading targets from BUILD files.
type TargetLoader interface {
	// LoadLabels loads targets from BUILD files associated with labels.
	// It returns a mapping from labels to targets or an error, if any
	// occurred.
	//
	// A label must be the absolute label associated with a target. For
	// example, '//foo/bar:baz' is acceptable whereas 'bar:baz' or '//foo/bar'
	// will result in undefined behavior. If no target is found associated
	// with a provided label, the label should be excluded from the returned
	// mapping but an error should not be returned.
	LoadLabels(labels []string) (map[string]*appb.Rule, error)
	// LoadImportPaths loads targets from BUILD files associated with import
	// paths relative to a root directory. It returns a mapping from import
	// paths to targets or an error, if any occurred.
	//
	// An import path is the path present in a TypeScript import statement
	// resolved relative to the workspace root. For example, an import
	// statement 'import baz from "../baz.ts"' declared in the TypeScript
	// source file '//foo/bar.ts' would have the import path of 'baz.ts'. If
	// no target is found associated with a provided import path, the import
	// path should be excluded from the returned mapping but an error should
	// not be returned.
	LoadImportPaths(ctx context.Context, root string, paths []string) (map[string]*appb.Rule, error)
}

// Analyzer uses a BuildLoader to generate dependency reports.
type Analyzer struct {
	loader TargetLoader
}

// New returns a new Analyzer which can be used to generate dependency reports.
func New(loader TargetLoader) *Analyzer {
	return &Analyzer{loader: loader}
}

// Analyze generates a dependency report for each target label in labels.
//
// dir is the directory that ts_auto_deps should execute in. Must be a sub-directory
// of google3.
func (a *Analyzer) Analyze(ctx context.Context, dir string, labels []string) ([]*arpb.DependencyReport, error) {
	root, err := workspace.Root(dir)
	if err != nil {
		return nil, err
	}
	targets, err := a.loader.LoadLabels(labels)
	if err != nil {
		return nil, err
	}
	resolved, err := a.resolveImportsForTargets(ctx, root, targets)
	if err != nil {
		return nil, err
	}
	return a.generateReports(labels, resolved)
}

// resolvedTarget represents a Bazel target and all resolved information.
type resolvedTarget struct {
	label string
	// A map of all existing dependencies on a target at the time of analysis.
	// The keys are labels and the values are thes loaded target.
	dependencies map[string]*appb.Rule
	// A map of source file paths to their imports.
	imports map[string][]*ts_auto_depsImport
	// rule is the original rule the target was constructed from.
	rule *appb.Rule
	// missingSources are source files which could not be opened on disk.
	// These are added to the dependency reports and MissingSources.
	missingSources []string
}

func (t *resolvedTarget) srcs() ([]string, error) {
	srcs, err := sources(t.rule)
	if err != nil {
		// Targets without sources are considered errors.
		return nil, err
	}
	return srcs, nil
}

func (t *resolvedTarget) deps() []string {
	return listAttribute(t.rule, "deps")
}

// provides returns whether the resolved target can provide the path provided.
func (t *resolvedTarget) provides(path string) bool {
	srcs, err := t.srcs()
	if err != nil {
		return false
	}
	for _, src := range srcs {
		if src == path {
			return true
		}
	}
	return false
}

// newTarget constructs a new target instance from a loaded rule.
func newResolvedTarget(r *appb.Rule) *resolvedTarget {
	return &resolvedTarget{
		label:        r.GetName(),
		dependencies: make(map[string]*appb.Rule),
		imports:      make(map[string][]*ts_auto_depsImport),
		rule:         r,
	}
}

// resolveImportsForTargets attempts to resolve the imports in the sources of
// each target in targets.
func (a *Analyzer) resolveImportsForTargets(ctx context.Context, root string, allTargets map[string]*appb.Rule) (map[string]*resolvedTarget, error) {
	targets := make(map[string]*resolvedTarget)
	var allDeps, allSrcs []string
	for _, t := range allTargets {
		target := newResolvedTarget(t)
		targets[target.label] = target
		srcs, err := target.srcs()
		if err != nil {
			return nil, err
		}
		allDeps = append(allDeps, target.deps()...)
		allSrcs = append(allSrcs, srcs...)
	}
	deps, err := a.loader.LoadLabels(allDeps)
	if err != nil {
		return nil, err
	}
	// Associate the loaded existing deps with the target or targets which
	// contained them.
	for _, t := range targets {
		for _, dep := range t.deps() {
			t.dependencies[dep] = deps[dep]
		}
	}
	imports, errs := extractAllImports(root, allSrcs)
	for _, err := range errs {
		// NotExist errors are caught and added to the generated dependency
		// reports as missing source files. Only errors which are not NotExist
		// errors should be reported.
		if !os.IsNotExist(err) {
			return nil, err
		}
	}
	for _, t := range targets {
		srcs, err := t.srcs()
		if err != nil {
			return nil, err
		}
		for _, src := range srcs {
			v, ok := imports[src]
			if ok {
				t.imports[src] = v
			} else {
				// The source was not found on disk during import extraction.
				t.missingSources = append(t.missingSources, relativePathLabel(t.label, src))
			}
		}
	}
	if err := a.resolveImports(ctx, root, targets); err != nil {
		return nil, err
	}
	return targets, nil
}

// resolveImports finds targets which provide the imported file or library
// for imports without known targets.
func (a *Analyzer) resolveImports(ctx context.Context, root string, targets map[string]*resolvedTarget) error {
	var paths []string
	needingResolution := make(map[string][]*ts_auto_depsImport)
	for _, target := range targets {
		for _, imports := range target.imports {
		handlingImports:
			for _, imp := range imports {
				resolvedPath := imp.resolvedPath()
				for _, path := range pathWithExtensions(resolvedPath) {
					if target.provides(path) {
						imp.knownTarget = target.label
						continue handlingImports
					}
				}
				d, err := a.findRuleProvidingImport(target.dependencies, imp)
				if err != nil {
					return err
				}
				if d == "" {
					// A target providing the import was not found on the
					// existing dependencies or in a comment. Use other
					// heuristics.
					paths = append(paths, resolvedPath)
					needingResolution[resolvedPath] = append(needingResolution[resolvedPath], imp)
					continue
				}
				imp.knownTarget = d
			}
		}
	}
	if len(needingResolution) == 0 {
		return nil
	}
	res, err := a.loader.LoadImportPaths(ctx, root, paths)
	if err != nil {
		return err
	}
	for path, imports := range needingResolution {
		if target, ok := res[path]; ok {
			for _, imp := range imports {
				imp.knownTarget = redirectedLabel(target)
			}
		}
	}
	return nil
}

func pathWithExtensions(basename string) []string {
	var paths []string
	for _, ext := range extensions {
		paths = append(paths, basename+ext)
	}
	return paths
}

// findRuleProvidingImport looks through a map of loaded rules for a rule
// which can provide the passed import.
//
// If the import already has a knownTarget, findRuleProvidingImport will
// return the knownTarget.
func (a *Analyzer) findRuleProvidingImport(rules map[string]*appb.Rule, i *ts_auto_depsImport) (string, error) {
	if i.knownTarget != "" {
		return i.knownTarget, nil
	}
	for _, r := range rules {
		moduleName := stringAttribute(r, "module_name")
		if moduleName == "" {
			continue
		}
		srcs := listAttribute(r, "srcs")
		for _, src := range srcs {
			_, _, file := edit.ParseLabel(src)
			moduleImportPath := moduleName + "/" + stripTSExtension(file)
			if i.importPath == moduleImportPath || i.importPath == strings.TrimSuffix(moduleImportPath, "/index") {
				return r.GetName(), nil
			}
		}
	}
	return "", nil
}

// stripTSExtension removes TypeScript extensions from a file path. If no
// TypeScript extensions are present, the filepath is returned unaltered.
func stripTSExtension(path string) string {
	for _, ext := range extensions {
		if strings.HasSuffix(path, ext) {
			return strings.TrimSuffix(path, ext)
		}
	}
	return path
}

// redirectedLabel looks in the target's tags for a tag starting with
// 'alt_dep=' followed by a label. If such a tag is found, the label is
// returned. Otherwise, the target's own label is returned.
func redirectedLabel(target *appb.Rule) string {
	for _, tag := range listAttribute(target, "tags") {
		if trimmedTag := strings.TrimPrefix(tag, "alt_dep="); trimmedTag != tag {
			return trimmedTag
		}
	}
	// No 'alt_dep=' tag was present on the target so no redirects need to occur.
	return target.GetName()
}

// sources creates an array of all sources listed in the 'srcs' attribute
// on each target in targets.
func sources(target *appb.Rule) ([]string, error) {
	srcs := listAttribute(target, "srcs")
	if srcs == nil {
		return nil, fmt.Errorf("target %q missing \"srcs\" attribute", target.GetName())
	}
	for i, src := range srcs {
		_, pkg, file := edit.ParseLabel(src)
		// TODO(jdhamlik): Handle generated files.
		srcs[i] = filepath.Clean(filepath.Join(pkg, file))
	}
	return srcs, nil
}

// generateReports generates reports for each label in labels.
func (a *Analyzer) generateReports(labels []string, targets map[string]*resolvedTarget) ([]*arpb.DependencyReport, error) {
	var reports []*arpb.DependencyReport
	for _, label := range labels {
		target, ok := targets[label]
		if !ok {
			// This case should never happen.
			platform.Fatalf("target %s no longer loaded", label)
		}
		report, err := a.generateReport(target)
		if err != nil {
			return nil, err
		}
		reports = append(reports, report)
	}
	return reports, nil
}

// generateReport generates a dependency report for a target.
//
// It adds imports for which no target could be found to unresolved imports.
// Imports which had locatable targets are added to the necessary dependency
// or missing dependency properties if the import was already present on target
// or the import was not already present respectively.
//
// Missing source files detected during import resolution are added to the
// reports. Dependencies which were present on the initial target but are not
// required are added to the unnecessary dependency array.
func (a *Analyzer) generateReport(target *resolvedTarget) (*arpb.DependencyReport, error) {
	usedDeps := make(map[string]bool)
	report := &arpb.DependencyReport{
		Rule: proto.String(target.label),
	}
	for _, imports := range target.imports {
	addingImports:
		for _, i := range imports {
			if i.knownTarget == "" {
				// The import could not be resolved into a target. A ts_auto_deps
				// comment needs to be added to the source by the user.
				if strings.HasPrefix(i.importPath, "goog:") {
					// This feedback needs to be phrased this way since the
					// updater.go relies on parsing the feedback strings to
					// determine which 'goog:' imports to add.
					report.Feedback = append(report.Feedback,
						fmt.Sprintf(
							"ERROR: %s:%d:%d: missing comment for 'goog:' import, "+
								"please add a trailing comment to the import. E.g.\n  "+
								"import Bar from '%s'; // from //foo:bar",
							i.location.sourcePath, i.location.line, i.location.offset, i.importPath))
				}
				report.UnresolvedImport = append(report.UnresolvedImport, i.resolvedPath())
			} else if i.knownTarget == target.label {
				// The knownTarget for an import is the target it is a member of.
				continue addingImports
			} else {
				for _, dep := range target.deps() {
					if dep == i.knownTarget {
						usedDeps[dep] = true
						report.NecessaryDependency = append(report.NecessaryDependency, i.knownTarget)
						continue addingImports
					}
				}
				report.MissingDependencyGroup = append(report.MissingDependencyGroup, &arpb.DependencyGroup{
					Dependency: []string{edit.ShortenLabel(i.knownTarget, "")},
					ImportPath: []string{i.resolvedPath()},
				})
			}
		}
	}
	report.MissingSourceFile = target.missingSources

	var unusedDeps []string
	for _, dep := range target.deps() {
		if _, ok := usedDeps[dep]; !ok {
			unusedDeps = append(unusedDeps, dep)
		}
	}
	// Check if the unused deps are TypeScript rules. Only report non-
	// TypeScript rules as unnecessary deps.
	res, err := a.loader.LoadLabels(unusedDeps)
	if err != nil {
		return nil, err
	}
	for _, dep := range unusedDeps {
		target := res[dep]
		if c := target.GetRuleClass(); isTazeManagedRuleClass(c) {
			report.UnnecessaryDependency = append(report.UnnecessaryDependency, dep)
		}
	}
	return report, nil
}

// relativePathLabel converts src to a label for a path relative to the
// provided target. For example, a target '//foo/bar' and a src 'foo/bar/baz.ts'
// would result in a relative path label of '//foo/bar:baz.ts'.
func relativePathLabel(label, src string) string {
	_, pkg, _ := edit.ParseLabel(label)
	return fmt.Sprintf("//%s:%s", pkg, strings.TrimPrefix(src, pkg+"/"))
}

// listAttribute retrieves the attribute from target with name.
func listAttribute(target *appb.Rule, name string) []string {
	if a := attribute(target, name); a != nil {
		return a.GetStringListValue()
	}
	return nil
}

func stringAttribute(target *appb.Rule, name string) string {
	if a := attribute(target, name); a != nil {
		return a.GetStringValue()
	}
	return ""
}

func attribute(target *appb.Rule, name string) *appb.Attribute {
	for _, a := range target.GetAttribute() {
		if a.GetName() == name {
			return a
		}
	}
	return nil
}

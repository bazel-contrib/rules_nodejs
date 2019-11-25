// Package analyze uses blaze query to determine and locate missing imports
// in TypeScript source files.
package analyze

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"google3/net/proto2/go/proto"
	"google3/third_party/bazel_buildifier/edit/edit"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/platform"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/workspace"

	appb "google3/third_party/bazel/src/main/protobuf/build_go_proto"
	arpb "google3/third_party/bazel_rules/rules_typescript/ts_auto_deps/proto/analyze_result_go_proto"
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

const (
	// debug enables/disables debug logging. Set to true to have debug statements
	// print to stdout, set to false to disable debug statements.
	debug = false
)

// debugf prints a formatted message prefixed with "DEBUG:" if the debug
// flag is enabled.
func debugf(format string, v ...interface{}) {
	if debug {
		fmt.Printf(fmt.Sprintf("DEBUG: %s\n", format), v...)
	}
}

// TargetLoader provides methods for loading targets from BUILD files.
type TargetLoader interface {
	// LoadTargets loads targets from BUILD files associated with labels. A target
	// is a rule, source file, generated file, package group or environment group.
	// It returns a mapping from labels to targets or an error, if any occurred.
	//
	// A label must be the absolute label associated with a target. For example,
	// '//foo/bar:baz' is acceptable whereas 'bar:baz' or '//foo/bar' will result
	// in undefined behavior. TODO(lucassloan): make this an error
	//
	// Only returns targets visible to currentPkg. If currentPkg is an empty
	// string returns all targets regardless of visibility.
	LoadTargets(currentPkg string, labels []string) (map[string]*appb.Target, error)
	// LoadRules loads rules from BUILD files associated with labels.
	// It returns a mapping from labels to rules or an error, if any
	// occurred.
	//
	// A label must be the absolute label associated with a rule. For
	// example, '//foo/bar:baz' is acceptable whereas 'bar:baz' or '//foo/bar'
	// will result in undefined behavior.
	// TODO(lucassloan): make this an error.
	//
	// Only returns rules visible to currentPkg. If currentPkg is an empty string
	// returns all rules regardless of visibility.
	LoadRules(currentPkg string, labels []string) (map[string]*appb.Rule, error)
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
	//
	// Only returns rules visible to currentPkg. If currentPkg is an empty string
	// returns all targets regardless of visibility.
	LoadImportPaths(ctx context.Context, targetToAnalyze *appb.Rule, currentPkg, root string, paths []string) (map[string]*appb.Rule, error)
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
// dir is the directory that taze should execute in. Must be a sub-directory
// of the workspace root.
func (a *Analyzer) Analyze(ctx context.Context, dir string, labels []string) ([]*arpb.DependencyReport, error) {
	if len(labels) == 0 {
		return nil, nil
	}
	_, currentPkg, _ := edit.ParseLabel(labels[0])
	for _, label := range labels {
		if _, pkg, _ := edit.ParseLabel(label); pkg != currentPkg {
			return nil, fmt.Errorf("can't analyze targets in different packages")
		}
	}
	root, err := workspace.Root(dir)
	if err != nil {
		return nil, err
	}
	rules, err := a.loader.LoadRules(currentPkg, labels)
	if err != nil {
		return nil, err
	}
	resolved, err := a.resolveImportsForTargets(ctx, currentPkg, root, rules)
	if err != nil {
		return nil, err
	}
	return a.generateReports(labels, resolved)
}

// resolvedTarget represents a Blaze target and all resolved information.
type resolvedTarget struct {
	label string
	// A map of all existing dependencies on a target at the time of analysis.
	// The keys are labels and the values are thes loaded target.
	dependencies map[string]*appb.Rule
	// A map of source file paths to their imports.
	imports map[string][]*tazeImport
	// rule is the original rule the target was constructed from.
	rule *appb.Rule
	// missingSources are source files which could not be opened on disk.
	// These are added to the dependency reports and MissingSources.
	missingSources []string
	// A map from the labels in the target's srcs to the Targets those
	// labels refer.
	sources              map[string]*appb.Target
	literalSourcePaths   []string
	generatedSourcePaths []string
}

// setSources sets the sources on t.  It returns an error if one of the srcs of
// t's rule isn't in loadedSrcs.  It also sorts the sources into literal and
// generated sources, setting literalSourcePaths and generatedSourcePaths.
// Returns an error if all the sources are generated - taze can't read the
// import statements to determine deps.
func (t *resolvedTarget) setSources(loadedSrcs map[string]*appb.Target) error {
	for _, label := range listAttribute(t.rule, "srcs") {
		src := loadedSrcs[label]
		if src == nil {
			return fmt.Errorf("no source found for label %s", label)
		}
		t.sources[label] = src
		if src.GetType() == appb.Target_SOURCE_FILE {
			t.literalSourcePaths = append(t.literalSourcePaths, labelToPath(label))
		} else {
			t.generatedSourcePaths = append(t.generatedSourcePaths, labelToPath(label))
		}
	}
	if len(t.literalSourcePaths) == 0 && len(t.generatedSourcePaths) > 0 {
		return fmt.Errorf("rule has generated sources - cannot determine dependencies")
	}
	return nil
}

// srcs returns the labels of the sources of t.
func (t *resolvedTarget) srcs() ([]string, error) {
	srcs := listAttribute(t.rule, "srcs")
	if srcs == nil {
		return nil, fmt.Errorf("target %q missing \"srcs\" attribute", t.label)
	}

	return srcs, nil
}

// getAllLiteralSrcPaths returns the file paths of all the non-generated sources
// of the targets.
func getAllLiteralSrcPaths(targets map[string]*resolvedTarget) ([]string, error) {
	var allLiteralSrcPaths []string
	for _, t := range targets {
		allLiteralSrcPaths = append(allLiteralSrcPaths, t.literalSourcePaths...)
	}

	return allLiteralSrcPaths, nil
}

func (t *resolvedTarget) deps() []string {
	return listAttribute(t.rule, "deps")
}

// provides returns whether the resolved target can provide the path provided.
func (t *resolvedTarget) provides(path string) bool {
	for _, label := range listAttribute(t.rule, "srcs") {
		src := t.sources[label]
		if src.GetType() == appb.Target_SOURCE_FILE {
			// For literal sources, check the path of the source
			if labelToPath(label) == path {
				return true
			}
		} else if src.GetType() == appb.Target_RULE {
			// For generated souces, check against the paths of rule's
			// outputs
			for _, genSrc := range src.GetRule().GetRuleOutput() {
				if labelToPath(genSrc) == path {
					return true
				}
			}
		}
	}
	return false
}

// newTarget constructs a new target instance from a loaded rule.
func newResolvedTarget(r *appb.Rule) *resolvedTarget {
	return &resolvedTarget{
		label:        r.GetName(),
		dependencies: make(map[string]*appb.Rule),
		imports:      make(map[string][]*tazeImport),
		rule:         r,
		sources:      make(map[string]*appb.Target),
	}
}

// resolveImportsForTargets attempts to resolve the imports in the sources of
// each target in targets.
func (a *Analyzer) resolveImportsForTargets(ctx context.Context, currentPkg, root string, allTargets map[string]*appb.Rule) (map[string]*resolvedTarget, error) {
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
	deps, err := a.loader.LoadRules(currentPkg, allDeps)
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
	// load all the sources in the targets, so that literal and generated
	// targets can be distinguished
	srcs, err := a.loader.LoadTargets(currentPkg, allSrcs)
	if err != nil {
		return nil, err
	}
	for _, t := range targets {
		err := t.setSources(srcs)
		if err != nil {
			return nil, err
		}
	}
	// only extract the imports out of the literal sources, since taze can't
	// see the contents of generated files
	allLiteralSrcPaths, err := getAllLiteralSrcPaths(targets)
	if err != nil {
		return nil, err
	}
	imports, errs := extractAllImports(root, allLiteralSrcPaths)
	for _, err := range errs {
		// NotExist errors are caught and added to the generated dependency
		// reports as missing source files. Only errors which are not NotExist
		// errors should be reported.
		if !os.IsNotExist(err) {
			return nil, err
		}
	}
	for _, t := range targets {
		srcs := t.literalSourcePaths
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
	if err := a.resolveImports(ctx, currentPkg, root, targets); err != nil {
		return nil, err
	}
	return targets, nil
}

// resolveImports finds targets which provide the imported file or library
// for imports without known targets.
func (a *Analyzer) resolveImports(ctx context.Context, currentPkg, root string, targets map[string]*resolvedTarget) error {
	for _, target := range targets {
		var paths []string
		needingResolution := make(map[string][]*tazeImport)
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
				d, err := a.findExistingDepProvidingImport(ctx, root, target, imp)
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
		if len(needingResolution) == 0 {
			continue
		}
		res, err := a.loader.LoadImportPaths(ctx, target.rule, currentPkg, root, paths)
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

var ambientModuleDeclRE = regexp.MustCompile("(?m)^\\s*declare\\s+module\\s+['\"]([^'\"]+)['\"]\\s+\\{")

// findExistingDepProvidingImport looks through a map of the existing deps to
// see if any of them provide the import in a way that can't be queried
// for.  E.g. if the build rule has a "module_name" attribute or if one
// of the .d.ts sources has an ambient module declaration.
//
// If the import already has a knownTarget, findRuleProvidingImport will
// return the knownTarget.
func (a *Analyzer) findExistingDepProvidingImport(ctx context.Context, root string, rt *resolvedTarget, i *tazeImport) (string, error) {
	if i.knownTarget != "" {
		return i.knownTarget, nil
	}

	// check if any of the existing deps declare a module_name that matches the import
	for _, r := range rt.dependencies {
		resolvedImportPath := resolveAgainstModuleRoot(r, i.importPath)
		if resolvedImportPath == i.importPath {
			continue
		}

		// enumerate all the possible filepaths for the resolved import path, and
		// compare against all the srcs
		possibleImportPaths := possibleFilepaths(resolvedImportPath)
		for _, src := range listAttribute(r, "srcs") {
			for _, mi := range possibleImportPaths {
				if mi == labelToPath(src) {
					return r.GetName(), nil
				}
			}
		}
	}

	// check if any of the other sources or the souces of any of the deps are .d.ts
	// files which have ambient module declarations
	var allRules []*appb.Rule
	for _, r := range rt.dependencies {
		allRules = append(allRules, r)
	}
	allRules = append(allRules, rt.rule)
	for _, r := range allRules {
		for _, src := range listAttribute(r, "srcs") {
			fp := filepath.Join(root, labelToPath(src))
			if !strings.HasSuffix(fp, ".d.ts") {
				continue
			}

			contents, err := platform.ReadFile(ctx, fp)
			if err != nil {
				return "", fmt.Errorf("error reading file looking for ambient module decls: %s", err)
			}

			matches := ambientModuleDeclRE.FindAllStringSubmatch(string(contents), -1)

			// put all the ambient modules into a set
			declaredModules := make(map[string]bool)
			for _, match := range matches {
				declaredModules[match[1]] = true
			}

			// remove all the modules that were imported (ie all the modules that
			// were being augmented/re-opened)
			for _, mi := range parseImports(fp, contents) {
				delete(declaredModules, mi.importPath)
			}

			if declaredModules[i.importPath] {
				debugf("found import %s in ambient module declaration in %s", i.importPath, r.GetName())
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

func labelToPath(label string) string {
	_, pkg, file := edit.ParseLabel(label)
	return platform.Normalize(filepath.Clean(filepath.Join(pkg, file)))
}

// generateReports generates reports for each label in labels.
func (a *Analyzer) generateReports(labels []string, labelToTarget map[string]*resolvedTarget) ([]*arpb.DependencyReport, error) {
	reports := make([]*arpb.DependencyReport, 0, len(labels))
	for _, label := range labels {
		target, ok := labelToTarget[label]
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
		Rule:              proto.String(target.label),
		MissingSourceFile: target.missingSources,
	}
	for _, imports := range target.imports {
	handlingImports:
		for _, imp := range imports {
			if imp.knownTarget == target.label {
				continue
			}
			if imp.knownTarget == "" {
				if strings.HasPrefix(imp.importPath, "goog:") {
					// This feedback needs to be phrased this way since the
					// updater.go relies on parsing the feedback strings to
					// determine which 'goog:' imports to add.
					report.Feedback = append(report.Feedback,
						fmt.Sprintf(
							"ERROR: %s:%d:%d: missing comment for 'goog:' import, "+
								"please add a trailing comment to the import. E.g.\n  "+
								"import Bar from '%s'; // from //foo:bar",
							imp.location.sourcePath, imp.location.line, imp.location.offset, imp.importPath))
				}
				report.UnresolvedImport = append(report.UnresolvedImport, imp.resolvedPath())
				continue
			}

			for _, dep := range target.deps() {
				if edit.LabelsEqual(dep, imp.knownTarget, "") {
					// fmt.Printf("%s provides %s\n", dep, imp.importPath)
					usedDeps[dep] = true
					report.NecessaryDependency = append(report.NecessaryDependency, imp.knownTarget)
					continue handlingImports
				}
			}
			report.MissingDependencyGroup = append(report.MissingDependencyGroup, &arpb.DependencyGroup{
				Dependency: []string{edit.ShortenLabel(imp.knownTarget, "")},
				ImportPath: []string{imp.importPath},
			})
		}
	}

	var unusedDeps []string
	for _, dep := range target.deps() {
		if _, ok := usedDeps[dep]; !ok {
			unusedDeps = append(unusedDeps, dep)
		}
	}
	labelToRule, err := a.loader.LoadRules("", unusedDeps)
	if err != nil {
		return nil, err
	}
	for label, rule := range labelToRule {
		switch class := rule.GetRuleClass(); class {
		case "ts_declaration":
			// TypeScript declarations might declare arbitrary global symbols, so it
			// is impossible to detect reliably if the import is being used (without
			// compiling, at least).  Report that the rule has no explicit import as a
			// warning, so that taze can decide to import remove or not based on a
			// flag.
			warning := fmt.Sprintf("WARNING: %s: keeping possibly used %s '%s'", rule.GetLocation(), class, label)
			report.Feedback = append(report.Feedback, warning)
		case "css_library":
			// Similar to ts_declaration, taze can't reliably detect if css_library
			// imports are being used, since taze can't currently parse @requirecss
			// annotations.  Unlike ts_declaration, there's no flag to remove them, so
			// there's no need to report a warning.
		default:
			// The contents of generated files aren't visible, so taze can't discover
			// the import statements/deps that they contain.  To be safe, don't remove
			// any unused deps, since they might be used by the generated file(s).
			if len(target.generatedSourcePaths) == 0 {
				report.UnnecessaryDependency = append(report.UnnecessaryDependency, label)
			}
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

func isGenerated(rule *appb.Rule) bool {
	return stringAttribute(rule, "generator_name") != ""
}

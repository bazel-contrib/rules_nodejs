// Package analyze uses bazel query to determine and locate missing imports
// in TypeScript source files.
package analyze

import (
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
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
	commonModuleLocations = []string{
		"//third_party/javascript/%s",
		"//third_party/javascript/node_modules/%s",
		"//third_party/javascript/typings/%s",
	}

	ts_auto_depsManagedRuleClasses = []string{
		"ts_library",
		"ts_declaration",
		"ng_module",
		"js_library",
	}

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
	LoadImportPaths(root string, paths []string) (map[string]*appb.Rule, error)
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
func (a *Analyzer) Analyze(dir string, labels []string) ([]*arpb.DependencyReport, error) {
	root, err := workspace.Root(dir)
	if err != nil {
		return nil, err
	}
	targets, err := a.loader.LoadLabels(labels)
	if err != nil {
		return nil, err
	}
	resolved, err := a.resolveImportsForTargets(root, targets)
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
func (a *Analyzer) resolveImportsForTargets(root string, allTargets map[string]*appb.Rule) (map[string]*resolvedTarget, error) {
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
	if err := a.resolveImports(root, targets); err != nil {
		return nil, err
	}
	return targets, nil
}

// resolveImports finds targets which provide the imported file or library
// for imports without known targets.
func (a *Analyzer) resolveImports(root string, targets map[string]*resolvedTarget) error {
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
	res, err := a.loader.LoadImportPaths(root, paths)
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
// returned. Otherwise, the target's own label is shortened and returned.
func redirectedLabel(target *appb.Rule) string {
	for _, tag := range listAttribute(target, "tags") {
		if trimmedTag := strings.TrimPrefix(tag, "alt_dep="); trimmedTag != tag {
			return trimmedTag
		}
	}
	// No 'alt_dep=' tag was present on the target so no redirects need to occur.
	return edit.ShortenLabel(target.GetName(), "")
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
					Dependency: []string{i.knownTarget},
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

// QueryBasedTargetLoader uses Bazel query to load targets from BUILD files.
type QueryBasedTargetLoader struct {
	workdir     string
	bazelBinary string
}

// NewQueryBasedTargetLoader constructs a new QueryBasedTargetLoader rooted
// in workdir.
func NewQueryBasedTargetLoader(workdir, bazelBinary string) *QueryBasedTargetLoader {
	return &QueryBasedTargetLoader{
		workdir:     workdir,
		bazelBinary: bazelBinary,
	}
}

// LoadLabels uses Bazel query to load targets associated with labels from BUILD
// files.
func (q *QueryBasedTargetLoader) LoadLabels(labels []string) (map[string]*appb.Rule, error) {
	// Ensure the labels are unique to minimize the total number of targets that
	// need to be loaded.
	r, err := q.batchQuery(dedupeLabels(labels))
	if err != nil {
		return nil, err
	}
	targets := make(map[string]*appb.Rule)
	for _, target := range r.GetTarget() {
		t, o, err := q.resultObject(target)
		if err != nil {
			return nil, err
		}
		if desired := appb.Target_RULE; t != desired {
			return nil, fmt.Errorf("label %q included object of type %q instead of %q", o.GetName(), t, desired)
		}
		targets[o.GetName()] = o.(*appb.Rule)
	}
	return targets, nil
}

// dedupeLabels returns a new set of labels with no duplicates.
func dedupeLabels(labels []string) []string {
	m := make(map[string]bool)
	var u []string
	for _, label := range labels {
		if _, ok := m[label]; !ok {
			m[label] = true
			u = append(u, label)
		}
	}
	return u
}

// target is the object of an appb.Target instance. This can be any of:
// source file, generated file, environment group, rule, or package group.
//
// Methods which are shared between all of the possible objects are added
// here.
type target interface {
	GetName() string
}

// resultObject retrieves the object included in target. Uses the discriminator
// present on the target to determine which object to return.
func (q *QueryBasedTargetLoader) resultObject(target *appb.Target) (appb.Target_Discriminator, target, error) {
	switch t := target.GetType(); t {
	case appb.Target_ENVIRONMENT_GROUP:
		return t, target.GetEnvironmentGroup(), nil
	case appb.Target_GENERATED_FILE:
		return t, target.GetGeneratedFile(), nil
	case appb.Target_PACKAGE_GROUP:
		return t, target.GetPackageGroup(), nil
	case appb.Target_RULE:
		return t, target.GetRule(), nil
	case appb.Target_SOURCE_FILE:
		return t, target.GetSourceFile(), nil
	default:
		// Unfortunately we cannot get the label of the target which caused
		// the issue.
		return t, nil, fmt.Errorf("target has object of unknown type %q", t)
	}
}

// LoadImportPaths uses Bazel Query to load targets associated with import
// paths from BUILD files.
func (q *QueryBasedTargetLoader) LoadImportPaths(root string, paths []string) (map[string]*appb.Rule, error) {
	var remainingImportPaths []string
	results := make(map[string]*appb.Rule)
	for _, path := range paths {
		if trim := strings.TrimPrefix(path, workspace.Name()+"/"); trim != path {
			// TODO(jdhamlik): Optimize by grouping the queries into one larger query.
			// TODO(jdhamlik): Handle .d.ts and .tsx files.
			r, err := q.query(trim + ".ts")
			if err != nil {
				return nil, err
			}
			targets := r.GetTarget()
			// Expecting to get one, and only one, target per query.
			n := len(targets)
			if n < 1 {
				return nil, fmt.Errorf("failed to resolved a target for file %q", trim+".ts")
			}
			if n > 1 {
				return nil, fmt.Errorf("got %d targets when only one was expected", n)
			}
			t, err := q.loadRuleIncludingFile(targets[0].GetSourceFile().GetName())
			if err != nil {
				return nil, err
			}
			results[path] = t
		} else if trim := strings.TrimPrefix(path, "goog:"); trim != path {
			// There are no current heuristics in this implementation for
			// 'goog:' imports. That is handled by the ts_auto_deps binary proper.
			results[path] = nil
		} else {
			// The import is not explicitly under google3 or a closure-style
			// import.
			remainingImportPaths = append(remainingImportPaths, path)
		}
	}
	var potentialCommonImports []string
	// Attempt to locate the file rooted in the workspace even though it isn't
	// prefixed by 'google3/'.
	for _, imp := range remainingImportPaths {
		// If the path has a suffix of ".ngfactory" or ".ngsummary", it might
		// be an Angular AOT generated file. We can infer the target as we
		// infer its corresponding ngmodule target by simply stripping the
		// ".ngfactory" / ".ngsummary" suffix
		path := strings.TrimSuffix(strings.TrimSuffix(imp, ".ngsummary"), ".ngfactory")
		res, err := q.batchQuery(pathWithExtensions(path))
		if err != nil {
			return nil, err
		}
		if len(res.GetTarget()) > 0 {
			t, obj, err := q.resultObject(res.GetTarget()[0])
			if err != nil {
				return nil, err
			}
			if desired := appb.Target_SOURCE_FILE; t != desired {
				return nil, fmt.Errorf("label %q included object of type %q instead of %q", obj.GetName(), t, desired)
			}
			target, err := q.loadRuleIncludingFile(obj.GetName())
			if err != nil {
				return nil, err
			}
			results[imp] = target
			continue
		}
		potentialCommonImports = append(potentialCommonImports, imp)
	}
	if err := q.resolveImportsInCommonLocations(results, potentialCommonImports); err != nil {
		return nil, err
	}
	return results, nil
}

// loadRuleIncludingFile loads the target associated with a file label.
func (q *QueryBasedTargetLoader) loadRuleIncludingFile(fileLabel string) (*appb.Rule, error) {
	_, pkg, file := edit.ParseLabel(fileLabel)
	// Filter the targets in the file label's package to only targets which
	// include the file in their 'srcs' attribute.
	r, err := q.query(fmt.Sprintf("attr('srcs', %s, //%s:*)", file, pkg))
	if err != nil {
		return nil, err
	}
	for _, target := range r.GetTarget() {
		rule := target.GetRule()
		for _, src := range listAttribute(rule, "srcs") {
			_, _, path := edit.ParseLabel(src)
			// Return the first rule which has a source file exactly matching
			// the requested file path.
			if path == file {
				return rule, nil
			}
		}
	}
	return nil, fmt.Errorf("failed to resolved a target for file label %q", fileLabel)
}

// searchCommonLocations searches through common locations like third_party to
// find a target providing imports which cannot be resolved using other
// techniques.
func (q *QueryBasedTargetLoader) resolveImportsInCommonLocations(results map[string]*appb.Rule, paths []string) error {
	var queries []string
	labelToPath := make(map[string]string)
	// TODO(jdhamlik): Determine how to resolve this target. Whether alias
	// support should be dropped entirely, this "platform_browser_safe" import
	// should be special cased, or alias resolution should be implemented.

	for _, path := range paths {
		// third_party uses '_' instead of '-' since the latter is not allowed
		// in target labels
		underscored := strings.Replace(path, "-", "_", -1)
		file := underscored
		module := underscored
		if i := strings.Index(underscored, "/"); i >= 0 {
			// Use the slash in the import path as a separator between the
			// module name and the path under the module.
			file = underscored[i+1:]
			module = commonModuleName(underscored[:i])
		}
		for _, l := range commonModuleLocations {
			// Construct the potential target label in the common location.
			target := fmt.Sprintf("%s:%s", fmt.Sprintf(l, module), file)
			queries = append(queries, target)
			labelToPath[target] = path
		}
	}
	r, err := q.batchQuery(queries)
	if err != nil {
		return err
	}
	for _, target := range r.GetTarget() {
		r := target.GetRule()
		// TODO(jdhamlik): Determine if it's required that the alias resolves to
		// an allowedRuleClass.
		// Allow alias rules to provide imports. Alias rules should only appear
		// in this context if they are special-cased above.
		if c := r.GetRuleClass(); isTazeManagedRuleClass(c) || c == "alias" {
			results[labelToPath[r.GetName()]] = r
		}
	}
	return nil
}

// commonModuleName maps module names to their common names. If no common name
// is set for a module, it returns the module's name as is.
func commonModuleName(path string) string {
	return path
}

// isTazeManagedRuleClass checks if a class is a ts_auto_deps-managed rule class.
func isTazeManagedRuleClass(class string) bool {
	for _, c := range ts_auto_depsManagedRuleClasses {
		if c == class {
			return true
		}
	}
	return false
}

// batchQuery runs a set of queries with a single call to Bazel query and the
// '--keep_going' flag.
func (q *QueryBasedTargetLoader) batchQuery(queries []string) (*appb.QueryResult, error) {
	// Join all of the queries with a '+' character according to Bazel's
	// syntax for running multiple queries.
	return q.query("--keep_going", strings.Join(queries, "+"))
}

func (q *QueryBasedTargetLoader) query(args ...string) (*appb.QueryResult, error) {
	n := len(args)
	if n < 1 {
		return nil, fmt.Errorf("expected at least one argument")
	}
	if query := args[n-1]; query == "" {
		// An empty query was provided so return an empty result without
		// making a call to Bazel.
		return &appb.QueryResult{}, nil
	}
	args = append([]string{"query", "--output=proto"}, args...)
	cmd := exec.Command(q.bazelBinary, args...)
	cmd.Dir = q.workdir
	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	// Collect all of stdout and stderr. Stdout will contain the QueryResult,
	// if any, and stderr will contain any potential errors either as a result
	// of the '--keep_going' flag or other, more problematic, errors.
	stdout, err := ioutil.ReadAll(stdoutPipe)
	if err != nil {
		return nil, err
	}
	stderr, err := ioutil.ReadAll(stderrPipe)
	if err != nil {
		return nil, err
	}
	if err := cmd.Wait(); err != nil {
		// Exit status 3 is a direct result of one or more queries in a set of
		// queries not returning a result while running with the '--keep_going'
		// flag. Since one query failing to return a result does not hinder the
		// other queries from returning a result, ignore these errors.
		if err.Error() != "exit status 3" {
			// The error provided as a result is less useful than the contents of
			// stderr for debugging.
			return nil, fmt.Errorf(string(stderr))
		}
	}
	var result appb.QueryResult
	if err := proto.Unmarshal(stdout, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

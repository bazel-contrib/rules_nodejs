package analyze

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/bazelbuild/buildtools/edit"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/platform"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/workspace"
	"github.com/golang/protobuf/proto"

	appb "github.com/bazelbuild/buildtools/build_proto"
)

// pkgCacheEntry represents a set of loaded rules and a mapping from alias
// to rules from a package.
type pkgCacheEntry struct {
	// rules is all rules in a package.
	rules []*appb.Rule
	// aliases is a map from an alias label to the actual rule of the alias.
	aliases map[string]*appb.Rule
}

// QueryBasedTargetLoader uses Bazel query to load targets from BUILD files.
type QueryBasedTargetLoader struct {
	workdir     string
	bazelBinary string

	// pkgCache is a mapping from a package to all of the rules in said
	// package along with a map from aliases to actual rules.
	//
	// Keys are of the form of "<visibility>|<package>" where visibility
	// is the package that rules in package must be visible to and package
	// is the actual package that has been loaded and cached.
	//
	// Since a new target loader is constructed for each directory being
	// analyzed in the "-recursive" case, these caches will be garbage
	// collected between directories.
	pkgCache map[string]*pkgCacheEntry
	// labelCache is a mapping from a label to its loaded target.
	labelCache map[string]*appb.Target

	// queryCount is the total number of queries executed by the target loader.
	queryCount int
}

// NewQueryBasedTargetLoader constructs a new QueryBasedTargetLoader rooted
// in workdir.
func NewQueryBasedTargetLoader(workdir, bazelBinary string) *QueryBasedTargetLoader {
	return &QueryBasedTargetLoader{
		workdir:     workdir,
		bazelBinary: bazelBinary,

		pkgCache:   make(map[string]*pkgCacheEntry),
		labelCache: make(map[string]*appb.Target),
	}
}

// LoadRules uses Bazel query to load rules associated with labels from BUILD
// files.
func (q *QueryBasedTargetLoader) LoadRules(pkg string, labels []string) (map[string]*appb.Rule, error) {
	labelToTarget, err := q.LoadTargets(pkg, labels)
	if err != nil {
		return nil, err
	}

	labelToRule := make(map[string]*appb.Rule)
	for _, label := range labels {
		target := labelToTarget[label]
		if target.GetType() == appb.Target_RULE {
			labelToRule[label] = target.GetRule()
		} else {
			return nil, fmt.Errorf("target %s contains object of type %q instead of type %q", label, target.GetType(), appb.Target_RULE)
		}
	}
	return labelToRule, nil
}

// LoadTargets uses Bazel query to load targets associated with labels from BUILD
// files.
func (q *QueryBasedTargetLoader) LoadTargets(pkg string, labels []string) (map[string]*appb.Target, error) {
	var labelCacheMisses []string
	for _, label := range labels {
		if _, ok := q.labelCache[labelCacheKey(pkg, label)]; !ok {
			labelCacheMisses = append(labelCacheMisses, label)
		}
	}
	if len(labelCacheMisses) > 0 {
		var queries []string
		if pkg == "" {
			queries = labelCacheMisses
		} else {
			for _, label := range labelCacheMisses {
				queries = append(queries, fmt.Sprintf("visible(%s:*, %s)", pkg, label))
			}
		}
		r, err := q.batchQuery(queries)
		if err != nil {
			return nil, err
		}
		for _, target := range r.GetTarget() {
			label, err := q.targetLabel(target)
			if err != nil {
				return nil, err
			}
			q.labelCache[labelCacheKey(pkg, label)] = target
		}
		for _, label := range labelCacheMisses {
			key := labelCacheKey(pkg, label)
			if _, ok := q.labelCache[key]; !ok {
				// Set to nil so the result exists in the cache and is not
				// loaded again. If the nil is not added at the appropriate
				// cache key, LoadLabels will attempt to load it again when
				// next requested instead of getting a cache hit.
				q.labelCache[key] = nil
			}
		}
	}
	labelToTarget := make(map[string]*appb.Target)
	for _, label := range labels {
		labelToTarget[label] = q.labelCache[labelCacheKey(pkg, label)]
	}
	return labelToTarget, nil
}

func labelCacheKey(currentPkg, label string) string {
	return currentPkg + "^" + label
}

// possibleFilepaths generates the possible filepaths for the ts import path.
// e.g. google3/foo/bar could be foo/bar.ts or foo/bar.d.ts or foo/bar/index.ts, etc.
// Also handles special angular import paths (.ngfactory and .ngsummary).
func possibleFilepaths(importPath string) []string {
	// If the path has a suffix of ".ngfactory" or ".ngsummary", it might
	// be an Angular AOT generated file. We can infer the target as we
	// infer its corresponding ngmodule target by simply stripping the
	// ".ngfactory" / ".ngsummary" suffix
	importPath = strings.TrimSuffix(strings.TrimSuffix(importPath, ".ngsummary"), ".ngfactory")
	importPath = strings.TrimPrefix(importPath, workspace.Name()+"/")

	var possiblePaths []string

	possiblePaths = append(possiblePaths, pathWithExtensions(importPath)...)
	possiblePaths = append(possiblePaths, pathWithExtensions(filepath.Join(importPath, "index"))...)

	return possiblePaths
}

// LoadImportPaths uses Bazel Query to load targets associated with import
// paths from BUILD files.
func (q *QueryBasedTargetLoader) LoadImportPaths(ctx context.Context, targetToAnalyze *appb.Rule, currentPkg, workspaceRoot string, paths []string) (map[string]*appb.Rule, error) {
	debugf("loading imports visible to %q relative to %q: %q", currentPkg, workspaceRoot, paths)
	results := make(map[string]*appb.Rule)

	addedPaths := make(map[string]bool)
	var possibleFilePaths []string
	possiblePathToPaths := make(map[string][]string)
	// for all the normalized typescript import paths, generate all the possible
	// corresponding file paths
	for _, path := range paths {
		if strings.HasPrefix(path, "goog:") {
			// 'goog:' imports are resolved using an sstable.
			results[path] = nil
			continue
		}
		if strings.HasPrefix(path, "@") {
			continue
		}

		if _, ok := addedPaths[path]; !ok {
			addedPaths[path] = true

			// there isn't a one to one mapping from ts import paths to file
			// paths, so look for all the possible file paths
			pfs := possibleFilepaths(path)
			possibleFilePaths = append(possibleFilePaths, pfs...)
			// map the file paths back to the import paths so we can map the file
			// labels back to the import paths
			for _, pf := range pfs {
				possiblePathToPaths[pf] = append(possiblePathToPaths[pf], path)
			}
		}
	}

	// query for all the possible filepaths, to determine which ones are real
	r, err := q.batchQuery(possibleFilePaths)
	if err != nil {
		return nil, err
	}
	var fileLabels, packages []string
	fileToGeneratorLabel := make(map[string]string)
	pathToLabels := make(map[string][]string)
	// get the labels for all the files which exist
	for _, target := range r.GetTarget() {
		label, err := q.fileLabel(target)
		if err != nil {
			return nil, err
		}
		switch target.GetType() {
		case appb.Target_GENERATED_FILE:
			file := target.GetGeneratedFile()
			generator := file.GetGeneratingRule()
			label = file.GetName()

			fileLabels = append(fileLabels, label)
			_, pkg, _ := edit.ParseLabel(label)
			packages = append(packages, pkg)
			// a generated file can be included as a source by referencing the label
			// of the generated file, or the label of the generating rule, so check
			// for both
			fileToGeneratorLabel[labelToPath(label)] = labelToPath(generator)
			// map file label back to the import paths so that they can be looked for
			// in the srcs of the rules
			for _, path := range possiblePathToPaths[labelToPath(label)] {
				pathToLabels[path] = append(pathToLabels[path], label)
			}
		case appb.Target_SOURCE_FILE:
			fileLabels = append(fileLabels, label)
			_, pkg, _ := edit.ParseLabel(label)
			packages = append(packages, pkg)
			// map file label back to the import paths so that they can be looked for
			// in the srcs of the rules
			for _, path := range possiblePathToPaths[labelToPath(label)] {
				pathToLabels[path] = append(pathToLabels[path], label)
			}
		}
	}

	// load all the rules in all the packages files were found in, so we can look
	// for aliases and reexporting libraries in the same package
	pkgToAllRules, pkgToActualToAlias, err := q.loadAllRulesInPackages("", packages)
	if err != nil {
		return nil, err
	}

	for _, path := range paths {
		// look up the corresponding file label(s) for the normalized typescript
		// import path
		for _, label := range pathToLabels[path] {
			_, pkg, _ := edit.ParseLabel(label)
			// get the file path that corresponds to the normalized typescript import
			// path
			filePath := labelToPath(label)
			allRules := pkgToAllRules[pkg]
			actualToAlias := pkgToActualToAlias[pkg]
			var matchingDeps []*appb.Rule
			for _, candidate := range typeScriptRules(allRules) {
				// check if the rule has the file or the generator of the file in its
				// srcs
				possibleSources := []string{filePath}
				if gl, ok := fileToGeneratorLabel[filePath]; ok {
					possibleSources = append(possibleSources, gl)
				}
				provides, err := q.ruleProvidesImports(candidate, srcsContainsAnyFilePath(possibleSources))
				if err != nil {
					return nil, err
				}
				if !provides {
					continue
				}

				if alias, ok := actualToAlias[candidate.GetName()]; ok {
					candidate = alias
				}
				matchingDeps = append(matchingDeps, candidate)
			}
			if len(matchingDeps) > 0 {
				canonicalRule, err := q.chooseCanonicalDep(currentPkg, targetToAnalyze, matchingDeps)
				if err != nil {
					return nil, err
				}
				results[path] = canonicalRule
			}
		}
	}

	return results, nil
}

// chooseCanonicalDep chooses between rules which include the imported file as
// a source (ie the rule that includes the file as a src, and any reexporting
// libraries).
//
// It filters the rules in a 3 stage process:
//
// 1. If only one of the rules is visible, choose that one, since the rule
// creator intended it to be imported.
//
// 2. If all or none of the rules are visible, choose the rule that directly
// includes the file as a src, since that reduces the chance of introducing
// circular dependencies.
//
// 3. Choose the rule that is already included as a dep.
func (q *QueryBasedTargetLoader) chooseCanonicalDep(currentPkg string, targetToAnalyze *appb.Rule, deps []*appb.Rule) (*appb.Rule, error) {
	// check for visibility
	filterForVisibility := func(deps []*appb.Rule) ([]*appb.Rule, error) {
		var labels []string
		for _, d := range deps {
			labels = append(labels, d.GetName())
		}
		visibleDepsMap, err := q.LoadRules(currentPkg, labels)
		if err != nil {
			return nil, err
		}

		var visibleDeps []*appb.Rule
		for _, d := range visibleDepsMap {
			if d != nil {
				visibleDeps = append(visibleDeps, d)
			}
		}

		return visibleDeps, nil
	}

	// if there's a visible reexporting lib and a visible lib with the src, favor
	// the lib with the src, to reduce the chance of introducing a circular
	// dependency
	filterForBaseLibs := func(deps []*appb.Rule) ([]*appb.Rule, error) {
		var baseDeps []*appb.Rule
		for _, d := range deps {
			if !isReexportingLib(d) {
				baseDeps = append(baseDeps, d)
			}
		}

		return baseDeps, nil
	}

	// favor the dep that's already on the rule
	filterForExistingDeps := func(deps []*appb.Rule) ([]*appb.Rule, error) {
		var existingDeps []*appb.Rule
		for _, d := range deps {
			for _, existing := range listAttribute(targetToAnalyze, "deps") {
				if d.GetName() == existing {
					existingDeps = append(existingDeps, d)
				}
			}
		}

		return existingDeps, nil
	}

	filters := []func(deps []*appb.Rule) ([]*appb.Rule, error){
		filterForVisibility,
		filterForBaseLibs,
		filterForExistingDeps,
	}

	// for each filter, return if it returned a single rule, narrow the set of deps if
	// it discarded some, but not all, and try the full set with the next filter if it
	// discarded them all
	for _, filter := range filters {
		filteredDeps, err := filter(deps)
		if err != nil {
			return nil, err
		}
		if len(filteredDeps) == 1 {
			return filteredDeps[0], nil
		} else if len(filteredDeps) > 0 {
			deps = filteredDeps
		}
	}

	// no filter got down to a single rule, just return the first
	return deps[0], nil
}

// ruleLabel returns the label for a target which is a rule.  Returns an error if
// target is not a rule.
func (q *QueryBasedTargetLoader) ruleLabel(target *appb.Target) (string, error) {
	if t := target.GetType(); t != appb.Target_RULE {
		return "", fmt.Errorf("target contains object of type %q instead of type %q", t, appb.Target_RULE)
	}
	return target.GetRule().GetName(), nil
}

// fileLabel returns the label for a target which is a file.  Returns an error if
// target is not a source file or a generated file.
func (q *QueryBasedTargetLoader) fileLabel(target *appb.Target) (string, error) {
	switch t := target.GetType(); t {
	case appb.Target_GENERATED_FILE:
		return target.GetGeneratedFile().GetName(), nil
	case appb.Target_SOURCE_FILE:
		return target.GetSourceFile().GetName(), nil
	default:
		return "", fmt.Errorf("target contains object of type %q instead of type %q or %q", t, appb.Target_SOURCE_FILE, appb.Target_GENERATED_FILE)
	}
}

// targetLabel returns the label for a target.  Returns an error if target is an
// unknown type.
func (q *QueryBasedTargetLoader) targetLabel(target *appb.Target) (string, error) {
	switch t := target.GetType(); t {
	case appb.Target_GENERATED_FILE:
		return target.GetGeneratedFile().GetName(), nil
	case appb.Target_SOURCE_FILE:
		return target.GetSourceFile().GetName(), nil
	case appb.Target_RULE:
		return target.GetRule().GetName(), nil
	case appb.Target_PACKAGE_GROUP:
		return target.GetPackageGroup().GetName(), nil
	case appb.Target_ENVIRONMENT_GROUP:
		return target.GetEnvironmentGroup().GetName(), nil
	default:
		return "", fmt.Errorf("target contains object of unknown type %q", t)
	}
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
	query := args[n-1]
	if query == "" {
		// An empty query was provided so return an empty result without
		// making a call to Bazel.
		return &appb.QueryResult{}, nil
	}
	var stdout, stderr bytes.Buffer
	args = append([]string{"query", "--output=proto"}, args...)
	q.queryCount++
	debugf("executing query #%d in %q: %s %s %q", q.queryCount, q.workdir, q.bazelBinary, strings.Join(args[:len(args)-1], " "), query)
	cmd := exec.Command(q.bazelBinary, args...)
	cmd.Dir = q.workdir
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	startTime := time.Now()
	if err := cmd.Run(); err != nil {
		// Exit status 3 is a direct result of one or more queries in a set of
		// queries not returning a result while running with the '--keep_going'
		// flag. Since one query failing to return a result does not hinder the
		// other queries from returning a result, ignore these errors.
		//
		// Herb prints "printing partial results" to indicate the same as bazel's
		// exit status 3
		if err.Error() != "exit status 3" && !strings.Contains(stderr.String(), "printing partial results") {
			// The error provided as a result is less useful than the contents of
			// stderr for debugging.
			return nil, fmt.Errorf(stderr.String())
		}
	}
	debugf("query #%d took %v", q.queryCount, time.Since(startTime))
	var result appb.QueryResult
	if err := proto.Unmarshal(stdout.Bytes(), &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ruleProvidesImports checks if the rule directly provides the import, or if
// it's a reexporting lib, if one of its deps does.
func (q *QueryBasedTargetLoader) ruleProvidesImports(rule *appb.Rule, srcMatcher func(rule *appb.Rule) bool) (bool, error) {
	if srcMatcher(rule) {
		return true, nil
	}

	if !isReexportingLib(rule) {
		return false, nil
	}

	// if the rule is a reexporting library, load all the rules that the rule
	// reexports, and check if they provide the imported paths.  This only handles
	// one level of reexport.
	_, pkg, _ := edit.ParseLabel(rule.GetName())
	// TODO(alexeagle): Batch calls to LoadLabels. Batching calls to ruleProvidesImport
	// would also be required.
	exportedRules, err := q.LoadRules(pkg, exportedLabels(rule))
	if err != nil {
		return false, err
	}
	for _, exportedRule := range exportedRules {
		if srcMatcher(exportedRule) {
			return true, nil
		}
	}

	return false, nil
}

// exportedLabels returns the labels exported by rule. Exported labels are the
// deps of a rule if the rule is an alias.
func exportedLabels(rule *appb.Rule) []string {
	var exported []string
	if isReexportingLib(rule) {
		exported = append(exported, listAttribute(rule, "deps")...)
	}
	return exported
}

// isReexportingLib checks if a library has no sources, which the TS rules use a
// way to mark a library as an alias.
func isReexportingLib(rule *appb.Rule) bool {
	return len(listAttribute(rule, "srcs")) == 0
}

// srcsContainsPath returns a function, which takes a rule, which returns true
// if the rule has a src which matches one of the possible filepaths for the
// provided typescript import path.
func srcsContainsPath(path string) func(rule *appb.Rule) bool {
	return func(rule *appb.Rule) bool {
		resolvedImportPath := resolveAgainstModuleRoot(rule, path)

		// enumerate all the possible filepaths for the resolved import path, and
		// compare against all the srcs
		possibleImportPaths := possibleFilepaths(resolvedImportPath)
		for _, src := range listAttribute(rule, "srcs") {
			for _, mi := range possibleImportPaths {
				if mi == labelToPath(src) {
					return true
				}
			}
		}

		return false
	}
}

// srcsContainsFilePath returns a function which takes a rule, which returns
// true if the rule has a src which, if pathified, equals one of the filePaths.
func srcsContainsAnyFilePath(filePaths []string) func(rule *appb.Rule) bool {
	return func(rule *appb.Rule) bool {
		for _, filePath := range filePaths {
			for _, src := range listAttribute(rule, "srcs") {
				if filePath == labelToPath(src) {
					return true
				}
			}
		}

		return false
	}
}

// loadAllRulesInPackages loads all rules in all packages.
//
// If an alias or aliases are present in the package, the rules for each alias'
// 'actual' attribute are loaded and a map from each 'actual' rule to its alias
// rule is constructed.
//
// loadAllRulesInPackages returns two maps. The first map is a map from a package
// label to all of the rules in the package. The second map is a map from a
// package to the map of 'actual' rules to alias rules for that package.
func (q *QueryBasedTargetLoader) loadAllRulesInPackages(currentPkg string, packages []string) (map[string][]*appb.Rule, map[string]map[string]*appb.Rule, error) {
	var missingPackages []string
	for _, pkg := range packages {
		if _, ok := q.pkgCache[pkgCacheKey(currentPkg, pkg)]; !ok {
			missingPackages = append(missingPackages, pkg)
		}
	}
	if len(missingPackages) > 0 {
		// Load any packages not already available in the cache.
		var queries []string
		pkgToRules := make(map[string][]*appb.Rule)
		pkgToAliasToRule := make(map[string]map[string]*appb.Rule)
		for _, pkg := range missingPackages {
			if currentPkg != "" {
				queries = append(queries, fmt.Sprintf("visible(%s:*, %s:*)", currentPkg, pkg))
			} else {
				queries = append(queries, fmt.Sprintf("%s:*", pkg))
			}
			pkgToAliasToRule[pkg] = make(map[string]*appb.Rule)
		}
		r, err := q.batchQuery(queries)
		if err != nil {
			return nil, nil, err
		}
		actualToAlias := make(map[string]*appb.Rule)
		pkgToActuals := make(map[string][]string)
		for _, target := range r.GetTarget() {
			if target.GetType() == appb.Target_RULE {
				rule := target.GetRule()
				_, pkg, _ := edit.ParseLabel(rule.GetName())
				if rule.GetRuleClass() == "alias" {
					// if the package contains an alias, derefence it (but only one layer
					// of aliases)
					actual := stringAttribute(rule, "actual")
					if actual == "" {
						// probably an alias with a select statement as the value for
						// 'actual' - just ignore
						platform.Infof(`alias %q has non-string "actual" attribute`, rule.GetName())
						continue
					}
					actualToAlias[actual] = rule
					pkgToActuals[pkg] = append(pkgToActuals[pkg], actual)
				} else {
					pkgToRules[pkg] = append(pkgToRules[pkg], rule)
				}
			}
		}
		for pkg, actuals := range pkgToActuals {
			// Load all the aliased targets, checking if they're visible from the
			// package where they're aliased from
			resolvedActuals, err := q.LoadTargets(pkg, actuals)
			if err != nil {
				return nil, nil, err
			}
			for actual, target := range resolvedActuals {
				// aliases can be for anything, but deps can only be rules, so ignore
				// other aliased targets
				if target.GetType() != appb.Target_RULE {
					continue
				}

				rule := target.GetRule()
				alias := actualToAlias[actual]
				_, pkg, _ := edit.ParseLabel(alias.GetName())
				pkgToAliasToRule[pkg][rule.GetName()] = alias
				pkgToRules[pkg] = append(pkgToRules[pkg], rule)
			}
		}
		for _, pkg := range missingPackages {
			q.pkgCache[pkgCacheKey(currentPkg, pkg)] = &pkgCacheEntry{
				rules:   pkgToRules[pkg],
				aliases: pkgToAliasToRule[pkg],
			}
		}
	}

	pkgToRules := make(map[string][]*appb.Rule)
	pkgToRuleToAlias := make(map[string]map[string]*appb.Rule)
	for _, pkg := range packages {
		cacheEntry := q.pkgCache[pkgCacheKey(currentPkg, pkg)]
		pkgToRules[pkg] = cacheEntry.rules
		pkgToRuleToAlias[pkg] = cacheEntry.aliases
	}

	return pkgToRules, pkgToRuleToAlias, nil
}

func pkgCacheKey(currentPkg, pkg string) string {
	return currentPkg + "|" + pkg
}

// dedupeLabels returns a new set of labels with no duplicates.
func dedupeLabels(labels []string) []string {
	addedLabels := make(map[string]bool)
	var uniqueLabels []string
	for _, label := range labels {
		if _, added := addedLabels[label]; !added {
			addedLabels[label] = true
			uniqueLabels = append(uniqueLabels, label)
		}
	}
	return uniqueLabels
}

// typeScriptRules returns all TypeScript rules in rules.
func typeScriptRules(rules []*appb.Rule) []*appb.Rule {
	var tsRules []*appb.Rule
	for _, rule := range rules {
		for _, supportedRuleClass := range []string{
			"ts_library",
			"ts_declaration",
			"ng_module",
		} {
			if rule.GetRuleClass() == supportedRuleClass {
				tsRules = append(tsRules, rule)
				break
			}
		}
	}
	return tsRules
}

// resolveAgainstModuleRoot resolves imported against moduleRoot and moduleName.
func resolveAgainstModuleRoot(rule *appb.Rule, imported string) string {
	moduleName := stringAttribute(rule, "module_name")
	if moduleName == "" {
		return imported
	}
	if !pathStartsWith(imported, moduleName) {
		return imported
	}
	// if module root is a file, remove the file extension, since it'll be added
	// by possibleFilepaths below
	moduleRoot := stripTSExtension(stringAttribute(rule, "module_root"))
	_, pkg, _ := edit.ParseLabel(rule.GetName())

	// resolve the import path against the module name and module root, ie if
	// the import path is @foo/bar and there's a moduleName of @foo the resolved
	// import path is location/of/foo/bar, or if there's also a moduleRoot of
	// baz, the resolved import path is location/of/foo/baz/bar
	//
	// using strings.TrimPrefix for trimming the path is ok, since
	// pathStartsWith already checked that moduleName is a proper prefix of
	// i.importPath
	return platform.Normalize(filepath.Join(pkg, moduleRoot, strings.TrimPrefix(imported, moduleName)))
}

// pathStartsWith checks if path starts with prefix, checking each path segment,
// so that @angular/core starts with @angular/core, but @angular/core-bananas
// does not
func pathStartsWith(path, prefix string) bool {
	pathParts := strings.Split(path, "/")
	prefixParts := strings.Split(prefix, "/")

	if len(prefixParts) > len(pathParts) {
		return false
	}

	for i, prefixPart := range prefixParts {
		if prefixPart != pathParts[i] {
			return false
		}
	}

	return true
}

// parsePackageName parses and returns the scope and package of imported. For
// example, "@foo/bar" would have a scope of "@foo" and a package of "bar".
func parsePackageName(imported string) (string, string) {
	firstSlash := strings.Index(imported, "/")
	if firstSlash == -1 {
		return imported, ""
	}
	afterSlash := imported[firstSlash+1:]
	if secondSlash := strings.Index(afterSlash, "/"); secondSlash > -1 {
		return imported[:firstSlash], afterSlash[:secondSlash]
	}
	return imported[:firstSlash], afterSlash
}

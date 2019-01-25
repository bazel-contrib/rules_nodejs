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
			return nil, fmt.Errorf("target contains object of type %q instead of type %q", target.GetType(), appb.Target_RULE)
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

// LoadImportPaths uses Bazel Query to load targets associated with import
// paths from BUILD files.
func (q *QueryBasedTargetLoader) LoadImportPaths(ctx context.Context, currentPkg, workspaceRoot string, paths []string) (map[string]*appb.Rule, error) {
	debugf("loading imports visible to %q relative to %q: %q", currentPkg, workspaceRoot, paths)
	results := make(map[string]*appb.Rule)

	addedPaths := make(map[string]bool)
	var possiblePaths []string
	for _, path := range paths {
		if strings.HasPrefix(path, "goog:") {
			// 'goog:' imports are resolved using an sstable.
			results[path] = nil
			continue
		}
		if !strings.HasPrefix(path, "@") {
			if _, ok := addedPaths[path]; !ok {
				addedPaths[path] = true

				// If the path has a suffix of ".ngfactory" or ".ngsummary", it might
				// be an Angular AOT generated file. We can infer the target as we
				// infer its corresponding ngmodule target by simply stripping the
				// ".ngfactory" / ".ngsummary" suffix
				path = strings.TrimSuffix(strings.TrimSuffix(path, ".ngsummary"), ".ngfactory")
				path = strings.TrimPrefix(path, workspace.Name()+"/")

				possiblePaths = append(possiblePaths, pathWithExtensions(path)...)
				possiblePaths = append(possiblePaths, pathWithExtensions(filepath.Join(path, "index"))...)
			}
		}
	}

	r, err := q.batchQuery(possiblePaths)
	if err != nil {
		return nil, err
	}
	var sourceFileLabels, generators []string
	generatorsToFiles := make(map[string][]*appb.GeneratedFile)
	for _, target := range r.GetTarget() {
		label, err := q.fileLabel(target)
		if err != nil {
			return nil, err
		}
		switch target.GetType() {
		case appb.Target_GENERATED_FILE:
			file := target.GetGeneratedFile()
			generator := file.GetGeneratingRule()

			generators = append(generators, generator)
			generatorsToFiles[generator] = append(generatorsToFiles[generator], file)
		case appb.Target_SOURCE_FILE:
			sourceFileLabels = append(sourceFileLabels, label)
		}
	}

	labelToRule := make(map[string]*appb.Rule)
	for len(generators) > 0 {
		generatorToRule, err := q.LoadRules(currentPkg, generators)
		if err != nil {
			return nil, err
		}
		var newGenerators []string
		for label, rule := range generatorToRule {
			_, _, target := edit.ParseLabel(label)

			if generator := stringAttribute(rule, "generator_name"); generator != "" && generator != target {
				// Located rule is also a generated rule. Look for the rule
				// that generates it.
				_, pkg, _ := edit.ParseLabel(label)
				newLabel := "//" + pkg + ":" + generator
				newGenerators = append(newGenerators, newLabel)
				generatorsToFiles[newLabel] = generatorsToFiles[label]
			} else {
				for _, generated := range generatorsToFiles[label] {
					labelToRule[generated.GetName()] = rule
				}
			}
		}
		generators = newGenerators
	}

	sourceLabelToRule, err := q.loadRulesIncludingSourceFiles(workspaceRoot, sourceFileLabels)
	if err != nil {
		return nil, err
	}
	for label, rule := range sourceLabelToRule {
		labelToRule[label] = rule
	}

	for label, rule := range labelToRule {
		_, pkg, file := edit.ParseLabel(label)
		// Trim "/index" suffixes that were added to path in the queries above.
		pathWithoutExtension := strings.TrimSuffix(filepath.Join(pkg, stripTSExtension(file)), string(filepath.Separator)+"index")
		for _, path := range paths {
			if pathWithoutExtension == strings.TrimSuffix(path, string(filepath.Separator)+"index") {
				results[path] = rule
			} else if pathWithoutExtension == strings.TrimSuffix(path, ".ngsummary") {
				results[path] = rule
			} else if pathWithoutExtension == strings.TrimSuffix(path, ".ngfactory") {
				results[path] = rule
			}
		}
	}

	return results, nil
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

// loadRuleIncludingSourceFiles loads all rules which include labels in
// sourceFileLabels, Returns a map from source file label to the rule which
// includes it.
func (q *QueryBasedTargetLoader) loadRulesIncludingSourceFiles(workspaceRoot string, sourceFileLabels []string) (map[string]*appb.Rule, error) {
	pkgToLabels := make(map[string][]string)
	queries := make([]string, 0, len(sourceFileLabels))
	for _, label := range sourceFileLabels {
		_, pkg, file := edit.ParseLabel(label)
		pkgToLabels[pkg] = append(pkgToLabels[pkg], label)
		// Query for all targets in the package which use file.
		queries = append(queries, fmt.Sprintf("attr('srcs', %s, //%s:*)", file, pkg))
	}
	r, err := q.batchQuery(queries)
	if err != nil {
		return nil, err
	}
	labelToRule := make(map[string]*appb.Rule)
	for _, target := range r.GetTarget() {
		label, err := q.ruleLabel(target)
		if err != nil {
			return nil, err
		}
		rule := target.GetRule()
		_, pkg, _ := edit.ParseLabel(label)
		labels := pkgToLabels[pkg]
		for _, src := range listAttribute(rule, "srcs") {
			for _, l := range labels {
				if src == l {
					labelToRule[l] = rule
					break
				}
			}
		}
	}
	return labelToRule, nil
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
		if err.Error() != "exit status 3" {
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

// isTazeManagedRuleClass checks if a class is a ts_auto_deps-managed rule class.
func isTazeManagedRuleClass(class string) bool {
	for _, c := range []string{
		"ts_library",
		// TODO(alexeagle): Add ts_declaration once it can be determined
		// if they are unused.
		"ng_module",
		"js_library",
	} {
		if c == class {
			return true
		}
	}
	return false
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
func resolveAgainstModuleRoot(label, moduleRoot, moduleName, imported string) string {
	if moduleRoot == "" && moduleName == "" {
		return imported
	}
	trim := strings.TrimPrefix(imported, moduleName)
	if trim == imported {
		return imported
	}
	_, pkg, _ := edit.ParseLabel(label)
	return platform.Normalize(filepath.Join(pkg, moduleRoot, trim))
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

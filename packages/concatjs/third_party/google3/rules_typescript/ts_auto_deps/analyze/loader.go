package analyze

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/bazelbuild/buildtools/edit"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/workspace"
	"github.com/golang/protobuf/proto"

	appb "github.com/bazelbuild/buildtools/build_proto"
)

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
	labelToRule := make(map[string]*appb.Rule)
	for _, target := range r.GetTarget() {
		label, err := q.ruleLabel(target)
		if err != nil {
			return nil, err
		}
		labelToRule[label] = target.GetRule()
	}
	return labelToRule, nil
}

// LoadImportPaths uses Bazel Query to load targets associated with import
// paths from BUILD files.
func (q *QueryBasedTargetLoader) LoadImportPaths(ctx context.Context, workspaceRoot string, paths []string) (map[string]*appb.Rule, error) {
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
	var sourceFileLabels []string
	for _, target := range r.GetTarget() {
		label, err := q.sourceFileLabel(target)
		if err != nil {
			return nil, err
		}
		sourceFileLabels = append(sourceFileLabels, label)
	}
	sourceLabelToRule, err := q.loadRulesIncludingSourceFiles(workspaceRoot, sourceFileLabels)
	if err != nil {
		return nil, err
	}
	for sourceLabel, rule := range sourceLabelToRule {
		_, pkg, file := edit.ParseLabel(sourceLabel)
		pathWithoutExtension := strings.TrimSuffix(filepath.Join(pkg, stripTSExtension(file)), string(filepath.Separator)+"index")
		for _, path := range paths {
			if pathWithoutExtension == path {
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

func (q *QueryBasedTargetLoader) ruleLabel(target *appb.Target) (string, error) {
	if t := target.GetType(); t != appb.Target_RULE {
		return "", fmt.Errorf("target contains object of type %q instead of type %q", t, appb.Target_RULE)
	}
	return target.GetRule().GetName(), nil
}

func (q *QueryBasedTargetLoader) sourceFileLabel(target *appb.Target) (string, error) {
	if t := target.GetType(); t != appb.Target_SOURCE_FILE {
		return "", fmt.Errorf("target contains object of type %q instead of type %q", t, appb.Target_SOURCE_FILE)
	}
	return target.GetSourceFile().GetName(), nil
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
	if query := args[n-1]; query == "" {
		// An empty query was provided so return an empty result without
		// making a call to Bazel.
		return &appb.QueryResult{}, nil
	}
	var stdout, stderr bytes.Buffer
	args = append([]string{"query", "--output=proto"}, args...)
	cmd := exec.Command(q.bazelBinary, args...)
	cmd.Dir = q.workdir
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
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
		"ts_declaration",
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
	return filepath.Join(pkg, moduleRoot, trim)
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

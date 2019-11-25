// Excluded from the open-source version since there are no taze comments. Also
// because the sstable is not available.

package updater

import (
	"bytes"
	"context"
	"fmt"
	"path/filepath"
	"regexp"
	"strconv"
	"sync"

	"google3/base/go/log"
	"google3/file/base/go/file"
	"google3/sstable/go/sstable"
	"google3/third_party/bazel_buildifier/edit/edit"

	arpb "google3/third_party/bazel_rules/rules_typescript/ts_auto_deps/proto/analyze_result_go_proto"
)

var missingCommentRE = regexp.MustCompile(
	`(?s)ERROR: ([^:]+):(\d+):(\d+): missing comment for 'goog:' import.*?'goog:([^']+)'`)

// fixMissingTazeComments adds taze `// from ...` comments to source files.
// It scans the given feedback reports for "missing taze comment" errors, looks up the missing namespaces
// in an sstable stored on x20, and then appends comments to the lines missing them.
// fixMissingTazeComments returns true if it fixed any missing comments.
func (upd *Updater) fixMissingTazeComments(ctx context.Context, g3root string, reports []*arpb.DependencyReport) (bool, error) {
	type location struct {
		file string
		line int
	}
	type missingComment struct {
		target    string
		locations []location
	}

	// Group reports and locations by namespace.
	nsToComment := make(map[string]*missingComment)
	for _, report := range reports {
		for _, fb := range report.GetFeedback() {
			log.Infof("fix taze comments: checking feedback:\n%s", fb)
			// Sadly, there is no way to return more structured feedback from blaze analyze.
			m := missingCommentRE.FindStringSubmatch(fb)
			if m == nil {
				continue
			}
			file := m[1]
			line, err := strconv.Atoi(m[2])
			if err != nil {
				return false, err
			}
			namespace := m[4]

			mc := nsToComment[namespace]
			if mc == nil {
				mc = &missingComment{}
				nsToComment[namespace] = mc
			}
			mc.locations = append(mc.locations, location{file: file, line: line})
		}
	}

	if len(nsToComment) == 0 {
		return false, nil
	}

	table, err := GetNamespaceToTargetTable()
	if err != nil {
		return false, err
	}

	tableLookupSpinner := spin(fmt.Sprintf("Searching %d namespaces for taze comments", len(nsToComment)))
	// Look up targets for missing namespaces
	// Group locations to add a specific target to by file.
	fileToLocs := make(map[string][]*missingComment)
	for namespace, mc := range nsToComment {
		log.Infof("Looking for namespace %s", namespace)
		it := table.Lookup(ctx, []byte(namespace))
		if it.Done() {
			log.Warningf("Couldn't find namespace %q", namespace)
			continue
		}
		target := string(it.Value())
		mc.target = target
		for _, l := range mc.locations {
			mc := &missingComment{target: mc.target, locations: []location{l}}
			fileToLocs[l.file] = append(fileToLocs[l.file], mc)
		}
	}
	close(tableLookupSpinner)

	// Add taze comments to files.
	fixedSomething := false
	for srcFile, mcs := range fileToLocs {
		p := filepath.Join(g3root, srcFile)
		content, err := file.ReadFile(ctx, p)
		if err != nil {
			log.Errorf("fix taze comments: failed to read %q: %v", p, err)
			continue
		}

		lines := bytes.Split(content, []byte("\n"))

		for _, mc := range mcs {
			loc := mc.locations[0]
			lineOffset := loc.line - 1
			if len(lines) < lineOffset {
				log.Errorf("fix taze comments: no line %d in %q", loc.line, p)
				continue
			}
			// Contains("//") is a bit overly broad here, but import URLs should not contain double
			// slashes either.
			if bytes.Contains(lines[lineOffset], []byte("//")) {
				return fixedSomething,
					&AnalysisFailedError{
						[]AnalysisFailureCause{
							AnalysisFailureCause{
								Message: fmt.Sprintf("cannot add taze comment to %s:%d, it already has a (malformed?) comment."+
									" Please remove or fix the comment.",
									srcFile, loc.line),
								Path: srcFile,
								Line: loc.line,
							},
						},
					}
			}
			var line bytes.Buffer
			target := edit.ShortenLabel(mc.target, "") // pass "" as pkg to always get absolute package references.
			fmt.Fprintf(&line, "%s // from %s", lines[lineOffset], target)
			lines[lineOffset] = line.Bytes()
		}
		newContent := string(bytes.Join(lines, []byte("\n")))
		if err := upd.updateFile(ctx, p, newContent); err != nil {
			log.Errorf("fix taze comments: failed to write %q: %v", p, err)
			continue
		}
		fmt.Printf("Added taze comments to %s\n", srcFile)
		fixedSomething = true
	}

	return fixedSomething, nil
}

var namespaceToTarget sstable.Table
var tableOnce sync.Once

// GetNamespaceToTargetTable opens and returns the taze table from x20.
// It is a variable so it can be overridden for testing.
var GetNamespaceToTargetTable = func() (sstable.Table, error) {
	tableOnce.Do(func() {
		ctx := context.Background()
		// This keeps the same sstable open for the entire (short) lifetime of the taze run.
		// That is by design: during one run, the table should not change from under us.
		t, err := sstable.Open(ctx, *namespaceLookupTable, &sstable.Options{})
		if err != nil {
			log.Errorf("Failed to open namespace to target sstable: %v", err)
			return
		}
		namespaceToTarget = t
	})
	if namespaceToTarget == nil {
		return nil, fmt.Errorf("fix taze comments: failed to open namespace sstable")
	}
	return namespaceToTarget, nil
}

// Matches the Closure namespace for an import inside a .ts file.
var googImportNamespace = regexp.MustCompile(`^import .* from 'goog:(.*)';.*`)

// Matches import lines that have a trailing taze comment.
// Capturing group 1 will be kept and the lookedup namespace will be appended.
// Based on a regex from
// java/com/google/devtools/ruleanalysis/service/checkbuilddeps/typescript/TypeScriptRuleChecker.java
var tazeCommentAfterStatement = regexp.MustCompile(`^(import .*;\s*//[ \t]*from[ \t]+)//.*$`)

func updateTazeCommentsOnImports(ctx context.Context, path string, namespaceToTargetTable sstable.Table) error {
	log.Infof("Updating taze import comments from %s\n", path)
	content, err := file.ReadFile(ctx, path)
	if err != nil {
		return fmt.Errorf("reading %q: %v", path, err)
	}
	lines := bytes.Split(content, []byte("\n"))
	for i, line := range lines {
		match := googImportNamespace.FindSubmatch(line)
		if match == nil {
			continue
		}
		namespace := match[1]
		it := namespaceToTargetTable.Lookup(ctx, namespace)
		if it.Done() {
			log.Infof("Attempted to update taze comment for %q but it is not in the index.\n", namespace)
			continue
		}
		newLine := tazeCommentAfterStatement.ReplaceAll(line, append([]byte("$1"), it.Value()...))
		if bytes.Compare(newLine, lines[i]) != 0 {
			log.Infof("Updated comment for %q in %q\n", namespace, path)
			lines[i] = newLine
		}
	}
	err = file.WriteFile(ctx, path, bytes.Join(lines, []byte("\n")))
	if err != nil {
		return fmt.Errorf("failed to write %q: %v", path, err)
	}
	return nil
}

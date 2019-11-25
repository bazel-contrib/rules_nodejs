// Excluded from the open-source version since there are no taze comments. Also
// because the sstable is not available.

package updater

import (
	"bytes"
	"context"
	"io/ioutil"
	"testing"

	"google3/sstable/go/sstable"
	"google3/sstable/go/sstabletest"
	"github.com/bazelbuild/rules_typescript/ts_auto_deps/workspace"

	arpb "google3/third_party/bazel_rules/rules_typescript/ts_auto_deps/proto/analyze_result_go_proto"
)

func TestFixMissingTazeComments(t *testing.T) {
	sstableContent := []sstabletest.Entry{
		{[]byte("goog.string"), []byte("//javascript/closure/string:string")},
		{[]byte("goog.array"), []byte("//javascript/closure/array:nondefault")},
	}
	sstabletest.Sort(sstableContent)
	table := sstabletest.NewTable(sstableContent)

	GetNamespaceToTargetTable = func() (sstable.Table, error) {
		return table, nil
	}

	p, err := mktmp("google3/foo/a.ts", []byte(`
		import {firstUsage} from 'goog:goog.string';
		import {x} from 'x';
		import {secondUsage} from 'goog:goog.string';
		import {hasComment} from 'goog:goog.string';  // from //javascript/closure/string
		import {otherNamespace} from 'goog:goog.array';`))
	if err != nil {
		t.Error(err)
	}
	g3root, err := workspace.Root(p)
	if err != nil {
		t.Error(err)
	}
	p2, err := mktmp("google3/foo/b.ts", []byte(`import {anotherUser} from 'goog:goog.string';`))
	if err != nil {
		t.Error(err)
	}

	report := parseReport(t, `
			rule: "//foo:bar"
			unresolved_import: "goog:goog.string"
			unresolved_import: "goog:goog.array"
			feedback: "ERROR: foo/a.ts:2:1: missing comment for 'goog:' import, please add a trailing comment to the import. E.g.\n"
					"    import Bar from 'goog:goog.string'; // from //foo:bar\n"
			feedback: "ERROR: foo/a.ts:4:1: missing comment for 'goog:' import, please add a trailing comment to the import. E.g.\n"
					"    import Bar from 'goog:goog.string'; // from //foo:bar\n"
			feedback: "ERROR: foo/a.ts:6:1: missing comment for 'goog:' import, please add a trailing comment to the import. E.g.\n"
					"    import Bar from 'goog:goog.array'; // from //foo:bar\n"`)
	report2 := parseReport(t, `
			rule: "//foo:baz"
			unresolved_import: "goog:goog.string"
			feedback: "ERROR: foo/b.ts:1:1: missing comment for 'goog:' import, please add a trailing comment to the import. E.g.\n"
					"    import Bar from 'goog:goog.string'; // from //foo:bar\n"`)

	ctx := context.Background()
	updater := New(false, false, nil, LocalUpdateFile)
	changed, err := updater.fixMissingTazeComments(ctx, g3root, []*arpb.DependencyReport{report, report2})
	if err != nil {
		t.Error(err)
	}
	if !changed {
		t.Error("fixMissingTazeComments: expected change")
	}

	content, err := ioutil.ReadFile(p)
	if err != nil {
		t.Error(err)
	}
	expected := `
		import {firstUsage} from 'goog:goog.string'; // from //javascript/closure/string
		import {x} from 'x';
		import {secondUsage} from 'goog:goog.string'; // from //javascript/closure/string
		import {hasComment} from 'goog:goog.string';  // from //javascript/closure/string
		import {otherNamespace} from 'goog:goog.array'; // from //javascript/closure/array:nondefault`
	if string(content) != expected {
		t.Errorf("fixMissingTazeComments(%q): got:\n%s, expected:\n%s", p, content, expected)
	}

	content, err = ioutil.ReadFile(p2)
	if err != nil {
		t.Error(err)
	}
	expected = `import {anotherUser} from 'goog:goog.string'; // from //javascript/closure/string`
	if string(content) != expected {
		t.Errorf("fixMissingTazeComments(%q): got:\n%s, expected:\n%s", p2, content, expected)
	}
}

func TestFixMissingTazeCommentsBadCommentFormat(t *testing.T) {
	sstableContent := []sstabletest.Entry{{[]byte("goog.string"), []byte("//javascript/closure/string:string")}}
	sstabletest.Sort(sstableContent)
	table := sstabletest.NewTable(sstableContent)

	GetNamespaceToTargetTable = func() (sstable.Table, error) {
		return table, nil
	}

	fileContents := []byte(`
		import {hasIncorrectComment} from 'goog:goog.string';  // from some:place
		`)
	p, err := mktmp("google3/foo/a.ts", fileContents)
	if err != nil {
		t.Error(err)
	}
	g3root, err := workspace.Root(p)
	if err != nil {
		t.Error(err)
	}

	report := parseReport(t, `
			rule: "//foo:bar"
			unresolved_import: "goog:goog.string"
			feedback: "ERROR: foo/a.ts:2:1: missing comment for 'goog:' import, please add a trailing comment to the import. E.g.\n"
					"    import Bar from 'goog:goog.string'; // from //foo:bar\n"`)
	ctx := context.Background()
	updater := New(false, false, nil, LocalUpdateFile)
	_, err = updater.fixMissingTazeComments(ctx, g3root, []*arpb.DependencyReport{report})
	expErr := "cannot add taze comment to foo/a.ts:2, it already has a (malformed?) comment. Please remove or fix the comment."
	if err == nil || err.Error() != expErr {
		t.Errorf("fixMissingTazeComments(%q): got error %q, expected %q", p, err, expErr)
	}

	if analysisErr, ok := err.(*AnalysisFailedError); ok {
		if len(analysisErr.Causes) != 1 {
			t.Errorf("fixMissingTazeComments(%q): got error causes %q, expected only one", p, analysisErr.Causes)
		}
		cause := analysisErr.Causes[0]
		expFile := "foo/a.ts"
		if cause.Path != expFile {
			t.Errorf("fixMissingTazeComments(%q): got error file %q, expected %q", p, expFile, cause.Path)
		}
		expLine := 2
		if cause.Line != expLine {
			t.Errorf("fixMissingTazeComments(%q): got error line %q, expected %q", p, expLine, cause.Line)
		}
	} else {
		t.Errorf("fixMissingTazeComments(%q): got error %q, expected it to be an AnalysisFailedError", p, err)
	}

	newContents, err := ioutil.ReadFile(p)
	if err != nil {
		t.Error(err)
	}
	if !bytes.Equal(newContents, fileContents) {
		t.Errorf("fixMissingTazeComments(%q): got:\n%s, expected unchanged:\n%s", p, newContents, fileContents)
	}
}

func TestUpdateTazeCommentsOnImports(t *testing.T) {
  sstableContent := []sstabletest.Entry{{[]byte("rapid.model.json"), []byte("//java/com/google/releasetools/rapid/static/js/model:model")}}
	sstabletest.Sort(sstableContent)
	table := sstabletest.NewTable(sstableContent)

  fileContents := []byte(`import {ProcessTypeEnum} from 'goog:rapid.model.json';  // from //java/com/google/releasetools/rapid/static/js/model:json_js`)
	p, err := mktmp("google3/foo/a.ts", fileContents)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	err = updateTazeCommentsOnImports(ctx, p, table)
	if err != nil {
		t.Error(err)
	}

	content, err := ioutil.ReadFile(p)
	if err != nil {
		t.Error(err)
	}
  expected := `import {ProcessTypeEnum} from 'goog:rapid.model.json';  // from //java/com/google/releasetools/rapid/static/js/model:model`
	if string(content) != expected {
		t.Errorf("updateTazeCommentsOnImports(%q): got:\n%s, expected:\n%s", p, content, expected)
	}
}

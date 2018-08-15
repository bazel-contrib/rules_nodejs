package analyze

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/bazelbuild/rules_typescript/ts_auto_deps/platform"
	"github.com/golang/protobuf/proto"
	"github.com/kylelemons/godebug/pretty"

	appb "github.com/bazelbuild/buildtools/build_proto"
	arpb "github.com/bazelbuild/rules_typescript/ts_auto_deps/proto"
)

var (
	testTmpDir = os.Getenv("TEST_TMPDIR")
)

func TestMain(m *testing.M) {
	if err := createWorkspaceFile(); err != nil {
		platform.Fatalf("failed to create WORKSPACE file: %q", err)
	}
	os.Exit(m.Run())
}

const (
	testDirectory = "a"
)

type fakeTargetLoader struct {
	targetsByLabels      map[string]string
	targetsByImportPaths map[string]string
}

func newFakeTargetLoader() *fakeTargetLoader {
	return &fakeTargetLoader{
		targetsByLabels:      make(map[string]string),
		targetsByImportPaths: make(map[string]string),
	}
}

func (bl *fakeTargetLoader) LoadLabels(_ string, labels []string) (map[string]*appb.Rule, error) {
	return bl.loadTargets(bl.targetsByLabels, labels)
}

func (bl *fakeTargetLoader) byLabel(label, value string) {
	bl.targetsByLabels[label] = value
}

func (bl *fakeTargetLoader) LoadImportPaths(_ context.Context, _, _ string, paths []string) (map[string]*appb.Rule, error) {
	return bl.loadTargets(bl.targetsByImportPaths, paths)
}

func (bl *fakeTargetLoader) byImportPath(importPath, value string) {
	bl.targetsByImportPaths[importPath] = value
}

func (bl *fakeTargetLoader) loadTargets(source map[string]string, keys []string) (map[string]*appb.Rule, error) {
	targets := make(map[string]*appb.Rule)
	for _, key := range keys {
		value, ok := source[key]
		if !ok {
			return nil, nil
		}
		var target appb.Rule
		if err := proto.UnmarshalText(strings.Trim(value, " \n\r\t"), &target); err != nil {
			return nil, err
		}
		targets[key] = &target
	}
	return targets, nil
}

type file struct {
	path     string
	contents []string
}

// testTarget represents a target with a label, a proto literal, and any import
// paths that should resolve to the target.
type testTarget struct {
	label, protoLiteral string
	importPaths         []string
}

func analyzeTargets(t *testing.T, labels []string, targets []*testTarget, files []*file) []*arpb.DependencyReport {
	t.Helper()
	for _, file := range files {
		path := filepath.Join(testDirectory, file.path)
		if err := createFile(path, file.contents...); err != nil {
			t.Errorf("failed to create file %q: %q", file.path, err)
			return nil
		}
		defer os.Remove(path)
	}
	for i, label := range labels {
		labels[i] = fmt.Sprintf("//%s:%s", testDirectory, label)
	}
	loader := newFakeTargetLoader()
	for _, t := range targets {
		label := t.label
		if !strings.HasPrefix(label, "//") {
			label = fmt.Sprintf("//%s:%s", testDirectory, label)
		}
		r := fmt.Sprintf("name: %q\n%s", label, t.protoLiteral)
		loader.byLabel(label, r)
		for _, i := range t.importPaths {
			loader.byImportPath(i, r)
		}
	}
	r, err := New(loader).Analyze(context.Background(), testTmpDir, labels)
	if err != nil {
		t.Errorf("Analyze(%q): failed to generate reports: %q", labels, err)
		return nil
	}
	if len(r) != len(labels) {
		t.Errorf("Analyze(%q): got %d reports, wanted %d", labels, len(r), len(labels))
		return nil
	}
	return r
}

func TestUnresolvedImports(t *testing.T) {
	tests := []struct {
		filepath, fileContents string
		expectedImports        []string
	}{
		{"b/importer.ts", "import X from './path';", []string{"a/b/path"}},
		{"b/importer.ts", "import X from 'absolute/path';", []string{"absolute/path"}},
		{"b/importer.ts", "import X from '../../root';", []string{"root"}},
		{"b/importer.ts", "import X from './multi/subpath';", []string{"a/b/multi/subpath"}},
		{"b/importer.ts", "import X from '/rooted';", []string{"/rooted"}},
		{"b/importer.ts", "import X from 'absolute/path';\nimport Y from './path';", []string{"absolute/path", "a/b/path"}},
		{"b/importer.ts", "import X from 'some/path'; // from  //target:location", nil},
		{"importer.d.ts", "import y from 'some/thing/missing';", []string{"some/thing/missing"}},
	}
	for _, test := range tests {
		r := analyzeTargets(t, []string{"a_lib"}, []*testTarget{
			{"a_lib", `
				rule_class: "ts_library"
				attribute: <
					name: "srcs"
					string_list_value: "//a:b/importer.ts"
					string_list_value: "//a:importer.d.ts"
					type: 5
				>`, nil},
		}, []*file{{test.filepath, []string{test.fileContents}}})
		if r == nil {
			continue
		}
		if diff := pretty.Compare(r[0].GetUnresolvedImport(), test.expectedImports); diff != "" {
			t.Errorf("Analyze(%q): failed to detect unresolved imports: (-got, +want)\n%s", test.fileContents, diff)
		}
	}
}

func TestUnnecessaryDependencies(t *testing.T) {
	tests := [][]string{
		[]string{"/* nothing */"},
	}
	for _, test := range tests {
		r := analyzeTargets(t, []string{"a_lib"}, []*testTarget{
			{"a_lib", `
				rule_class: "ts_library"
				attribute: <
					name: "srcs"
					string_list_value: "//a:importer.ts"
					type: 5
				>
				attribute: <
					name: "deps"
					string_list_value: "//a:b_lib"
					type: 5
				>`, nil},
			{"b_lib", `
				rule_class: "ts_library"`, nil},
		}, []*file{{"t/importer.ts", test}})
		if r == nil {
			continue
		}
		if diff := pretty.Compare(r[0].GetUnnecessaryDependency(), []string{"//a:b_lib"}); diff != "" {
			t.Errorf("Analyze(%q): failed to detect unnecessary dependencies: (-got, +want)\n%s", test, diff)
		}
	}
}

func TestNecessaryDependencies(t *testing.T) {
	tests := [][]string{
		[]string{"import x from 'b/target';"},
		[]string{"// ts_auto_deps: x from //b:b_lib"},
		[]string{"export x from 'b/target';"},
	}
	for _, test := range tests {
		r := analyzeTargets(t, []string{"a_lib"}, []*testTarget{
			{"a_lib", `
				rule_class: "ts_library"
				attribute: <
					type: 5
					name: "srcs"
					string_list_value: "//a:importer.ts"
				>
				attribute: <
					type: 5
					name: "deps"
					string_list_value: "//b:b_lib"
				>`, nil},
			{"//b:b_lib", `
				rule_class: "ts_library"
				attribute: <
					type: 5
					name: "srcs"
					string_list_value: "//b:target.ts"
				>`, []string{"b/target"}},
		}, []*file{{"importer.ts", test}})
		if r == nil {
			continue
		}
		if diff := pretty.Compare(r[0].GetNecessaryDependency(), []string{"//b:b_lib"}); diff != "" {
			t.Errorf("Analyze(%q): failed to detect necessary deps: (-got, +want)\n%s", test, diff)
		}
	}
}

func TestMissingDependencies(t *testing.T) {
	tests := []struct {
		fileContents string
		missingDeps  []string
	}{
		{"import x from 'b/c';\nimport y from 'angular';", []string{"//b/c:b_lib", "//third_party/javascript/typings/angular"}},
		{"import * as angular from 'angular';\ndeclare module 'angular' { /* reopen */ }", []string{"//third_party/javascript/typings/angular"}},
	}
	for _, test := range tests {
		r := analyzeTargets(t, []string{"a_lib"}, []*testTarget{
			{"a_lib", `
				rule_class: "ts_library"
				attribute: <
					type: 5
					name: "srcs"
					string_list_value: "//a:x.ts"
				>`, nil},
			{"//b/c:b_lib", `
				rule_class: "ts_library"
				attribute: <
					type: 5
					name: "srcs"
					string_list_value: "//b/c:index.ts"
				>`, []string{"b/c"}},
			{"//third_party/javascript/typings/angular:angular", `
				rule_class: "ts_declaration"
				attribute: <
					type: 5
					name: "srcs"
					string_list_value: "//third_party/javascript/typings/angular:index.d.ts"
				>`, []string{"angular"}},
		}, []*file{{"x.ts", []string{test.fileContents}}})
		if r == nil {
			continue
		}
		if diff := pretty.Compare(missingDeps(r[0]), test.missingDeps); diff != "" {
			t.Errorf("Analyze(%q): failed to detect missing dependencies: (-got, +want)\n%s", test.fileContents, diff)
		}
	}
}

func TestMissingSourceFile(t *testing.T) {
	r := analyzeTargets(t, []string{"a_lib"}, []*testTarget{
		{"a_lib", `
			rule_class: "ts_library"
			attribute: <
				type: 5
				name: "srcs"
				string_list_value: "//a:f1.ts"
				string_list_value: "//a:f2.ts"
				string_list_value: "//a:p/f3.ts"
			>`, nil},
	}, []*file{{"f1.ts", []string{"/* nothing */"}}})
	if r == nil {
		t.FailNow()
	}
	if diff := pretty.Compare(r[0].GetMissingSourceFile(), []string{"//a:f2.ts", "//a:p/f3.ts"}); diff != "" {
		t.Fatalf("Analyze: failed to detect missing source files: (-got, +want)\n%s", diff)
	}
}

func TestMultipleLabels(t *testing.T) {
	r := analyzeTargets(t, []string{"a_lib", "b_lib"}, []*testTarget{
		{"a_lib", `
			rule_class: "ts_library"
			attribute: <
				type: 5
				name: "srcs"
				string_list_value: "//a:a/importer.ts"
			>`, nil},
		{"b_lib", `
			rule_class: "ts_library"
			attribute: <
				type: 5
				name: "srcs"
				string_list_value: "//a:b/importer.ts"
			>`, nil},
	}, []*file{
		{"a/importer.ts", []string{"import X from './path';"}},
		{"b/importer.ts", []string{"import X from './path';"}},
	})
	if r == nil {
		t.FailNow()
	}
	tests := []struct {
		label             string
		unresolvedImports []string
	}{
		{"a_lib", []string{"a/a/path"}},
		{"b_lib", []string{"a/b/path"}},
	}
	for i, test := range tests {
		report := r[i]
		if diff := pretty.Compare(report.GetUnresolvedImport(), test.unresolvedImports); diff != "" {
			t.Errorf("Analyze(%q): failed to detect unresolved imports: (-got, +want)\n%s", test.label, diff)
		}
	}
}

func TestMultipleSourceFiles(t *testing.T) {
	r := analyzeTargets(t, []string{"a_lib"}, []*testTarget{
		{"a_lib", `
			rule_class: "ts_library"
			attribute: <
				type: 5
				name: "srcs"
				string_list_value: "//a:importer.ts"
				string_list_value: "//a:exporter.ts"
			>`, nil},
	}, []*file{
		{"importer.ts", []string{"import {x} from 'a/exporter';"}},
		{"exporter.ts", []string{"export let x = 12;"}},
	})
	if r == nil {
		t.FailNow()
	}
	if diff := pretty.Compare(missingDeps(r[0]), []string{}); diff != "" {
		t.Fatalf("Analyze: failed to detect missing dependencies: (-got, +want)\n%s", diff)
	}
}

func TestRedirectTag(t *testing.T) {
	r := analyzeTargets(t, []string{"a_lib"}, []*testTarget{
		{"a_lib", `
			rule_class: "ts_library"
			attribute: <
				type: 5
				name: "srcs"
				string_list_value: "//a:x.ts"
			>`, nil},
		{"dlib", `
			rule_class: "ts_library"
			attribute: <
				type: 5
				name: "deps"
				string_list_value: "//b:clib"
			>`, nil},
		{"clib", `
			rule_class: "ts_library"
			attribute: <
				type: 5
				name: "srcs"
				string_list_value: "//clib:c.ts"
			>
			attribute: <
				type: 5
				name: "tags"
				string_list_value: "alt_dep=//d:dlib"
			>`, []string{"b/c"}},
	}, []*file{{"x.ts", []string{"import x from 'b/c';"}}})
	if r == nil {
		t.FailNow()
	}
	if diff := pretty.Compare(missingDeps(r[0]), []string{"//d:dlib"}); diff != "" {
		t.Fatalf("Analyze: failed to detect missing dependencies: (-got, +want)\n%s", diff)
	}
}

func TestCircularImport(t *testing.T) {
	r := analyzeTargets(t, []string{"a_lib"}, []*testTarget{
		{"a_lib", `
			rule_class: "ts_library"
			attribute: <
				type: 5
				name: "srcs"
				string_list_value: "f1.ts"
				string_list_value: "f2.ts"
			>`, []string{"a/f1", "a/f2"}},
	}, []*file{
		{"f1.ts", []string{"import {x} from 'a/f1';", "export let y = x + 1;"}},
		{"f2.ts", []string{"import {y} from 'a/f2';", "export let x = y + 0;"}},
	})
	if r == nil {
		t.FailNow()
	}
	if diff := pretty.Compare(missingDeps(r[0]), []string{}); diff != "" {
		t.Fatalf("Analyze: failed to detect missing dependencies: (-got, +want)\n%s", diff)
	}
}

func TestListAttribute(t *testing.T) {
	tests := []struct {
		name  string
		value []string
	}{
		{"srcs", []string{"a.ts", "b.ts"}},
		{"deps", []string{":core"}},
	}
	result, err := createResult(`
		target: <
			type: 1
			rule: <
				name: "//tmp:tmp"
				rule_class: "ts_library"
				attribute: <
					type: 5
					name: "srcs"
					string_list_value: "a.ts"
					string_list_value: "b.ts"
				>
				attribute: <
					type: 5
					name: "deps"
					string_list_value: ":core"
				>
			>
		>`)
	if err != nil {
		t.Fatalf("failed to create result: %q", err)
	}
	for _, test := range tests {
		attrValue := listAttribute(result.GetTarget()[0].GetRule(), test.name)
		if attrValue == nil {
			t.Errorf("listAttribute(%q): failed to find attribute", test.name)
			continue
		}
		if diff := pretty.Compare(attrValue, test.value); diff != "" {
			t.Errorf("listAttribute(%q): failed to get correct attribute values: (-got, +want)\n%s", test.name, diff)
		}
	}
}

func TestStringAttribute(t *testing.T) {
	tests := []struct {
		name, value string
	}{
		{"module_name", "@angular/core"},
		{"module_root", ""},
	}
	result, err := createResult(`
		target: <
			type: 1
			rule: <
				name: "//tmp:tmp"
				rule_class: "ts_library"
				attribute: <
					type: 5
					name: "module_name"
					string_value: "@angular/core"
				>
			>
		>`)
	if err != nil {
		t.Fatalf("failed to create result: %q", err)
	}
	for _, test := range tests {
		attrValue := stringAttribute(result.GetTarget()[0].GetRule(), test.name)
		if diff := pretty.Compare(attrValue, test.value); diff != "" {
			t.Errorf("stringAttribute(%q): failed to get correct attribute values: (-got, +want)\n%s", test.name, diff)
		}
	}
}

func missingDeps(report *arpb.DependencyReport) []string {
	var deps []string
	for _, group := range report.GetMissingDependencyGroup() {
		deps = append(deps, group.GetDependency()...)
	}
	return deps
}

func createResult(str string) (*appb.QueryResult, error) {
	var result appb.QueryResult
	return &result, proto.UnmarshalText(strings.Trim(str, " \n\r\t"), &result)
}

func createFile(path string, content ...string) error {
	if !filepath.IsAbs(path) {
		path = filepath.Join(filepath.Dir(testTmpDir), path)
	}
	if err := os.MkdirAll(filepath.Dir(path), 0777); err != nil {
		return err
	}
	return ioutil.WriteFile(path, []byte(strings.Join(content, "\n")), 0666)
}

// This method creates a WORKSPACE file in the root of the Bazel test
// directory. This allows the tests to resolve the root path of the
// workspace by looking for the WORKSPACE file on disk.
func createWorkspaceFile() error {
	path := filepath.Join(filepath.Dir(testTmpDir), "WORKSPACE")
	return ioutil.WriteFile(path, []byte("workspace(name = 'foo')"), 0666)
}

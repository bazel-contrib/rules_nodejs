package updater

import (
	"context"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/bazelbuild/rules_typescript/ts_auto_deps/workspace"
)

func TestGoogle3Root(t *testing.T) {
	r, err := workspace.Root("a/google3/b/c")
	if err != nil {
		t.Error(err)
	}
	// Expect an absolute, resolved path.
	exp, err := filepath.Abs("a/google3")
	if r != exp {
		t.Errorf("got %s, expected %s", r, exp)
	}
}

func TestRegisterTestRule(t *testing.T) {
	ctx := context.Background()
	p, err := mktmp("google3/foo/BUILD", []byte(`ts_config(name = "tsconfig", deps = ["//foo/bar:bar_test"])`))
	if err != nil {
		t.Fatal(err)
	}
	barPath, err := mktmp("google3/foo/bar/BUILD", []byte(`ts_library(name = "bar_test", testonly=True)`))
	if err != nil {
		t.Fatal(err)
	}
	bazPath, err := mktmp("google3/foo/baz/BUILD", []byte(`ts_library(name = "baz_test", testonly=True)`))
	if err != nil {
		t.Fatal(err)
	}

	g3root := filepath.Dir(filepath.Dir(p))
	var updatedFile string
	testUpdateFile := UpdateFile(func(ctx context.Context, filePath string, _ string) error {
		var err error
		updatedFile, err = filepath.Rel(g3root, filePath)
		return err
	})

	updater := New(false, false, nil, testUpdateFile)
	_, _, err = updater.RegisterTestRules(ctx, barPath)
	if err != nil {
		t.Fatal(err)
	}
	if updatedFile != "" {
		t.Errorf("expected no update, got a write to %q", updatedFile)
	}

	_, _, err = updater.RegisterTestRules(ctx, bazPath)
	if err != nil {
		t.Fatal(err)
	}
	if updatedFile != "foo/BUILD" {
		t.Errorf("got an update to %q, expected foo/BUILD", updatedFile)
	}
}

func TestResolvePackages(t *testing.T) {
	p, err := mktmp("google3/sub/pkg/file", []byte(""))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(filepath.Dir(p)); err != nil {
		t.Fatal(err)
	}
	g3root := filepath.Dir(filepath.Dir(filepath.Dir(p)))
	if filepath.Base(g3root) != "google3" {
		t.Errorf("g3root should be called google3, got %q", g3root)
	}
	paths := []string{"//foo", "/bar"}
	if err := ResolvePackages(paths); err != nil {
		t.Fatal(err)
	}
	expected := []string{filepath.Join(g3root, "foo"), "/bar"}
	if !reflect.DeepEqual(paths, expected) {
		t.Errorf("ResolvePackages: got %s, expected %s", paths, expected)
	}
}

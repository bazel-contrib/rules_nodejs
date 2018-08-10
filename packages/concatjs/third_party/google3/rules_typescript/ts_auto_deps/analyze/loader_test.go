package analyze

import (
	"testing"

	"github.com/golang/protobuf/proto"

	appb "github.com/bazelbuild/buildtools/build_proto"
)

func TestResolveAgainstModuleRoot(t *testing.T) {
	tests := []struct {
		label, moduleRoot, moduleName, imported string
		expectedResolution                      string
	}{
		{"//a", "", "", "foo", "foo"},
		{"//b", "", "foo", "bar", "bar"},
		{"//c", "", "foo", "foo/bar", "c/bar"},
		{"//actual/loc:target", "mod/root", "foo/bar", "foo/bar/baz/bam", "actual/loc/mod/root/baz/bam"},
	}
	for _, test := range tests {
		if resolution := resolveAgainstModuleRoot(test.label, test.moduleRoot, test.moduleName, test.imported); resolution != test.expectedResolution {
			t.Errorf("resolveAgainstModuleRoot(%q): got %q, want %q", test.label, resolution, test.expectedResolution)
		}
	}
}

func TestParsePackageName(t *testing.T) {
	tests := []struct {
		input, scope, pkg string
	}{
		{"foo/bar", "foo", "bar"},
		{"foo/bar/baz", "foo", "bar"},
		{"foo", "foo", ""},
		{"", "", ""},
	}
	for _, test := range tests {
		if scope, pkg := parsePackageName(test.input); scope != test.scope || pkg != test.pkg {
			t.Errorf("moduleName(%q): got %q, %q, want %q, %q", test.input, scope, pkg, test.scope, test.pkg)
		}
	}
}

func parseRuleLiteral(literal string) (*appb.Rule, error) {
	var rule appb.Rule
	if err := proto.UnmarshalText(literal, &rule); err != nil {
		return nil, err
	}
	return &rule, nil
}

package analyze

import (
	"testing"

	"github.com/golang/protobuf/proto"

	appb "github.com/bazelbuild/buildtools/build_proto"
)

func TestResolveAgainstModuleRoot(t *testing.T) {
	tests := []struct {
		ruleLiteral string
		imported    string
		expected    string
	}{
		{
			ruleLiteral: `name: "//a"
			rule_class: "ts_library"`,
			imported: "foo",
			expected: "foo",
		},
		{
			ruleLiteral: `name: "//b"
			rule_class: "ts_library"
			attribute: <
				type: 4
				name: "module_name"
				string_value: "foo"
			>`,
			imported: "bar",
			expected: "bar",
		},
		{
			ruleLiteral: `name: "//c"
			rule_class: "ts_library"
			attribute: <
				type: 4
				name: "module_name"
				string_value: "foo"
			>`,
			imported: "foo/bar",
			expected: "c/bar",
		},
		{
			ruleLiteral: `name: "//actual/loc:target"
			rule_class: "ts_library"
			attribute: <
				type: 4
				name: "module_name"
				string_value: "foo/bar"
			>
			attribute: <
			type: 4
			name: "module_root"
			string_value: "mod/root"
			>`,
			imported: "foo/bar/baz/bam",
			expected: "actual/loc/mod/root/baz/bam",
		},
	}
	for _, test := range tests {
		rule, err := parseRuleLiteral(test.ruleLiteral)
		if err != nil {
			t.Errorf("isRuleAnAlias(%q): failed to parse literal: %s", test.ruleLiteral, err)
			continue
		}
		if actual := resolveAgainstModuleRoot(rule, test.imported); actual != test.expected {
			t.Errorf("resolveAgainstModuleRoot(%q): got %q, want %q", rule.GetName(), actual, test.expected)
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

package analyze

import (
	"fmt"
	"testing"

	"github.com/kylelemons/godebug/pretty"
)

func TestParseImports(t *testing.T) {
	tests := []struct{ text, importPath, knownTarget string }{
		// Imports
		{"import {a} from 'named';", "named", ""},
		{"code before;\n import {a} from 'before after'; code after",
			"before after", ""},
		{"import A from 'default';", "default", ""},
		{"import A$X from 'default';", "default", ""},
		{"import {x as $} from 'default';", "default", ""},
		{"import ü from 'default';", "default", ""},
		{"import * as prefix from 'wildcard prefixed';", "wildcard prefixed", ""},
		{" \t import {A, B as C} from 'renamed';", "renamed", ""},
		{"import 'sideeffect import';", "sideeffect import", ""},
		{"import\n {A\n, B} from 'newlines';", "newlines", ""},
		{"import*as prefix from'no whitespace';", "no whitespace", ""},
		{"import Symbol from 'goog:some.Symbol';  // from //target:location",
			"goog:some.Symbol", "//target:location"},
		{"import Symbol from 'goog:some.Symbol';//from  //target:location",
			"goog:some.Symbol", "//target:location"},
		{"import {a} from 'missing semi'", "missing semi", ""},
		{"import {a} from 'missing semi' // from //target:location",
			"missing semi", "//target:location"},
		{"import A, {B, C} from 'mixed';", "mixed", ""},
		{"import A, * as B from 'mixed';", "mixed", ""},
		{"import * as B, A from 'inverted mixed';", "inverted mixed", ""},
		// Exports
		{"export * from 'wildcard';", "wildcard", ""},
		{"export {a, b} from 'named';", "named", ""},
		{"export {} from 'empty import';", "empty import", ""},
		{"export {a as b} from 'renamed';", "renamed", ""},
		{"export\n {A\n, B} from 'newlines';", "newlines", ""},
		{"export*from'no whitespace';", "no whitespace", ""},
		{"export{}from'no whitespace';", "no whitespace", ""},
		// Comments
		{"x;\n// ts_auto_deps: ng from //some/global:rule\ny;", "", "//some/global:rule"},
		{"// ts_auto_deps: ng from //foo/bar from //some/global:rule", "", "//some/global:rule"},
	}

	for i, tst := range tests {
		imports := parseImports(fmt.Sprintf("test%d.ts", i), []byte(tst.text))
		if len(imports) != 1 {
			t.Errorf("parseImports(%q): got %d import(s), want 1", tst.text, len(imports))
			continue
		}
		imp := imports[0]
		if imp.importPath != tst.importPath {
			t.Errorf("parseImports(%q): got %q, want %q", tst.text, imp.importPath, tst.importPath)
		}
		if imp.knownTarget != tst.knownTarget {
			t.Errorf("parseImports(%q): got %q, want %q", tst.text, imp.knownTarget, tst.knownTarget)
		}
	}
}

func TestParseImportsSourceLocation(t *testing.T) {
	tests := []struct {
		text                   string
		expectedSourceLocation sourceLocation
	}{
		{"import {a} from 'named';", sourceLocation{line: 1, offset: 0, length: 24}},
		{"\n\timport {a} from 'named';", sourceLocation{line: 2, offset: 1, length: 25}},
	}
	for i, tst := range tests {
		sourcePath := fmt.Sprintf("test%d.ts", i)
		imports := parseImports(sourcePath, []byte(tst.text))
		if len(imports) != 1 {
			t.Errorf("parseImports(%q): got %d import(s), want 1", tst.text, len(imports))
			continue
		}
		imp := imports[0]
		tst.expectedSourceLocation.sourcePath = sourcePath
		if diff := pretty.Compare(imp.location, tst.expectedSourceLocation); diff != "" {
			t.Errorf("parseImports(%q): expected different source location: (-got, +want)\n%s", tst.text, diff)
		}
	}
}

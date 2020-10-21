import 'jasmine';
import {ConformancePatternRule, ErrorCode, PatternKind} from '../../rules/conformance_pattern_rule';
import {compileAndCheck, customMatchers} from '../../util/testing/test_support';

describe('BANNED_NAME', () => {
  it('matches simple example of globals', () => {
    const config = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'no Infinity',
      kind: PatternKind.BANNED_NAME,
      values: ['GLOBAL|Infinity']
    };
    const source = `Infinity; 1+1;`;
    const results = compileAndCheck(new ConformancePatternRule(config), source);

    expect(results).toHaveFailuresMatching(
        {matchedCode: `Infinity`, messageText: 'no Infinity'});
  });

  it('matches namespaced globals', () => {
    const config = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'no blob url',
      kind: PatternKind.BANNED_NAME,
      values: ['GLOBAL|URL.createObjectURL']
    };
    const source = `URL.createObjectURL({});`;
    const results = compileAndCheck(new ConformancePatternRule(config), source);

    expect(results).toHaveFailuresMatching(
        {matchedCode: `createObjectURL`, messageText: 'no blob url'});
  });

  it('does not choke on type aliases', () => {
    // This test case checks that we do not regress on the AbsoluteMatcher's
    // handling of type aliases. In dealias, from utils/ast_tools.ts, the
    // typechecker's getAliasedSymbol function should only be called with
    // Symbols that verify ts.SymbolFlags.Alias, and ts.SymbolFlags.TypeAlias is
    // not acceptable (the typechecker will throw).

    const config = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'should not trigger',
      kind: PatternKind.BANNED_NAME,
      values: ['ANY_SYMBOL|whatever']
    };
    const sources = [
      `export type Foo = {bar: number, baz: (x:string)=>void}`,
      `import {Foo} from './file_0';
       export const c: Foo["baz"] = (x:string)=>{};`,
      `import {c} from './file_1'; c(window.name);`
    ];
    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);

    expect(results).toHaveNoFailures();
  });
});

beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

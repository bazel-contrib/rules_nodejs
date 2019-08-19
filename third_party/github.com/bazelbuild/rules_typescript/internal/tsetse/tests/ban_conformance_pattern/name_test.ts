import 'jasmine';
import {ConformancePatternRule, PatternKind} from '../../rules/conformance_pattern_rule';
import {compileAndCheck, customMatchers} from '../../util/testing/test_support';

describe('BANNED_NAME', () => {
  it('matches simple example of globals', () => {
    const rule = new ConformancePatternRule({
      errorMessage: 'no Infinity',
      kind: PatternKind.BANNED_NAME,
      values: ['Infinity']
    });
    const source = [
      `Infinity; 1+1;`,
    ].join('\n');
    const results = compileAndCheck(rule, source);

    expect(results.length).toBe(1);
    expect(results[0]).toBeFailureMatching({
      matchedCode: `Infinity`,
      messageText: 'no Infinity'
    });
  });

  it('matches namespaced globals', () => {
    const rule = new ConformancePatternRule({
      errorMessage: 'no blob url',
      kind: PatternKind.BANNED_NAME,
      values: ['URL.createObjectURL']
    });
    const source = [
      `URL.createObjectURL({});`,
    ].join('\n');
    const results = compileAndCheck(rule, source);

    expect(results.length).toBe(1);
    expect(results[0]).toBeFailureMatching({
      matchedCode: `createObjectURL`,
      messageText: 'no blob url'
    });
  });

  it('does not choke on type aliases', () => {
    // This test case checks that we do not regress on the AbsoluteMatcher's
    // handling of type aliases. In dealias, from utils/ast_tools.ts, the
    // typechecker's getAliasedSymbol function should only be called with
    // Symbols that verify ts.SymbolFlags.Alias, and ts.SymbolFlags.TypeAlias is
    // not acceptable (the typechecker will throw).

    const sources = [
      `export type Foo = {bar: number, baz: (x:string)=>void}`,
      `import {Foo} from './file_0';
       export const c: Foo["baz"] = (x:string)=>{};`,
      `import {c} from './file_1'; c(window.name);`
    ];
    const results = compileAndCheck(
        new ConformancePatternRule({
          errorMessage: 'should not trigger',
          kind: PatternKind.BANNED_NAME,
          values: ['whatever']
        }),
        ...sources);

    expect(results.length).toBe(0);
  });
});

beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

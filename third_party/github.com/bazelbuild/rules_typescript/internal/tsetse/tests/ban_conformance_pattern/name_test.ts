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
      errorMessage: 'no Infinity'
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
      errorMessage: 'no blob url'
    });
  });
});

beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

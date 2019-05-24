import 'jasmine';
import {ConformancePatternRule, PatternKind} from '../../rules/conformance_pattern_rule';
import {compileAndCheck, customMatchers} from '../../util/testing/test_support';

describe('BANNED_PROPERTY_WRITE', () => {
  it('matches simple examples', () => {
    const source = `const q = document.createElement('q');\n` +
        `q.cite = 'some example string';\n`;
    const rule = new ConformancePatternRule({
      errorMessage: 'do not cite',
      kind: PatternKind.BANNED_PROPERTY_WRITE,
      values: ['HTMLQuoteElement.prototype.cite']
    });
    const results = compileAndCheck(rule, source);

    expect(results.length).toBe(1);
    expect(results[0])
        .toBeFailureMatching({start: 39, end: 69, errorMessage: 'do not cite'});
  });

  it('understands imported symbols', () => {
    const sources = [
      `const q = document.createElement('q'); export {q};`,
      `import {q} from './file_0'; q.cite = window.name;`
    ];
    const rule = new ConformancePatternRule({
      errorMessage: 'do not cite',
      kind: PatternKind.BANNED_PROPERTY_WRITE,
      values: ['HTMLQuoteElement.prototype.cite']
    });
    const results = compileAndCheck(rule, ...sources);

    expect(results.length).toBe(1);
    expect(results[0]).toBeFailureMatching({
      matchedCode: 'q.cite = window.name;',
      fileName: 'file_1.ts',
      errorMessage: 'do not cite',
    });
  });


  describe('with inheritance', () => {
    const source = [
      `class Parent {x:number}`,
      `class Child extends Parent {}`,
      `const c:Child = new Child();`,
      `c.x = 1;`,
    ].join('\n');

    // Both of these should have the same results: in `c.x`, `x` matches,
    // and `c` is both a Parent and a Child.
    const expectedFailure = {
      matchedCode: 'c.x = 1;',
      errorMessage: 'found write to x',
    };

    it('banning Parent.x matches (instance of Child).x', () => {
      const ruleOnParent = new ConformancePatternRule({
        errorMessage: 'found write to x',
        kind: PatternKind.BANNED_PROPERTY_WRITE,
        values: ['Parent.prototype.x']
      });
      const r = compileAndCheck(ruleOnParent, source);
      expect(r.length).toBe(1);
      expect(r[0]).toBeFailureMatching(expectedFailure);
    });

    it('banning Child.x matches x defined on Parent', () => {
      const ruleOnChild = new ConformancePatternRule({
        errorMessage: 'found write to x',
        kind: PatternKind.BANNED_PROPERTY_WRITE,
        values: ['Child.prototype.x']
      });
      const r = compileAndCheck(ruleOnChild, source);
      expect(r.length).toBe(1);
      expect(r[0]).toBeFailureMatching(expectedFailure);
    });
  });
});

beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

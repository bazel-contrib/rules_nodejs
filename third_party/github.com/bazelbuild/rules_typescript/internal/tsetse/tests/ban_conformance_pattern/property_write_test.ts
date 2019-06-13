import 'jasmine';
import {ConformancePatternRule, PatternKind} from '../../rules/conformance_pattern_rule';
import {compileAndCheck, customMatchers} from '../../util/testing/test_support';

describe('BANNED_PROPERTY_WRITE', () => {
  const rule = new ConformancePatternRule({
    errorMessage: 'do not cite',
    kind: PatternKind.BANNED_PROPERTY_WRITE,
    values: ['HTMLQuoteElement.prototype.cite']
  });

  it('matches simple examples', () => {
    const source = [
      `const q = document.createElement('q');`,
      `q.cite = 'some example string';`,
    ].join('\n');
    const results = compileAndCheck(rule, source);

    expect(results.length).toBe(1);
    expect(results[0]).toBeFailureMatching({
      matchedCode: `q.cite = 'some example string'`,
      messageText: 'do not cite'
    });
  });

  it('matches precisely, even with whitespace or comments', () => {
    const source = [
      `const q = document.createElement('q');`,
      `    q.cite = 'exampleA';`,
      `q.cite = 'exampleB'    ;`,
      `/* test1 */ q.cite = /* test2 */ 'exampleC' /* test3 */;`,
    ].join('\n');
    const results = compileAndCheck(rule, source);

    expect(results.length).toBe(3);
    expect(results[0]).toBeFailureMatching({
      matchedCode: `q.cite = 'exampleA'`,
      messageText: 'do not cite'
    });
    expect(results[1]).toBeFailureMatching({
      matchedCode: `q.cite = 'exampleB'`,
      messageText: 'do not cite'
    });
    expect(results[2]).toBeFailureMatching({
      matchedCode: `q.cite = /* test2 */ 'exampleC'`,
      messageText: 'do not cite'
    });
  })

  it('understands function prototypes', () => {
    const source = [
      `function foo(q:HTMLQuoteElement) {`,
      `    q.cite = 'some example string';`,
      `}`,
    ].join('\n');
    const results = compileAndCheck(rule, source);

    expect(results.length).toBe(1);
    expect(results[0]).toBeFailureMatching({
      matchedCode: `q.cite = 'some example string'`,
      messageText: 'do not cite'
    });
  });

  it('understands imported symbols', () => {
    const sources = [
      `const q = document.createElement('q'); export {q};`,
      `import {q} from './file_0'; q.cite = window.name;`
    ];
    const results = compileAndCheck(rule, ...sources);

    expect(results.length).toBe(1);
    expect(results[0]).toBeFailureMatching({
      matchedCode: 'q.cite = window.name',
      fileName: 'file_1.ts',
      messageText: 'do not cite',
    });
  });


  describe('with inheritance', () => {
    const source = [
      `class Parent { x: number }`,
      `class Child extends Parent {}`,
      `const c: Child = new Child();`,
      `c.x = 1;`,
    ].join('\n');

    // Both of these should have the same results: in `c.x`, `x` matches,
    // and `c` is both a Parent and a Child.
    const expectedFailure = {
      matchedCode: 'c.x = 1',
      messageText: 'found write to x',
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

  describe('with shadowing', () => {
    it('does not over-match', () => {
      const source = [
        `const q = document.createElement('q');`,
        `const f1 = (q: {cite: string}) => { q.cite = 'example 1'; };`,
      ].join('\n');
      const rule = new ConformancePatternRule({
        errorMessage: 'do not cite',
        kind: PatternKind.BANNED_PROPERTY_WRITE,
        values: ['HTMLQuoteElement.prototype.cite']
      });
      const results = compileAndCheck(rule, source);

      expect(results.length).toBe(0);
    });
  });
});

beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

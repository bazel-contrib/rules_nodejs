import 'jasmine';
import {ConformancePatternRule, ErrorCode, PatternKind} from '../../rules/conformance_pattern_rule';
import {compileAndCheck, customMatchers} from '../testing/test_support';

describe('BANNED_PROPERTY_WRITE', () => {
  describe('simple matcher tests', () => {
    const config = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'do not cite',
      kind: PatternKind.BANNED_PROPERTY_WRITE,
      values: ['HTMLQuoteElement.prototype.cite']
    };
    const rule = new ConformancePatternRule(config);

    it('matches simple examples', () => {
      const source = [
        `const q = document.createElement('q');`,
        `q.cite = 'some example string';`,
        `q['cite'] = 'some example string';`,
      ].join('\n');
      const results = compileAndCheck(rule, source);

      expect(results).toHaveFailuresMatching(
          {
            matchedCode: `q.cite = 'some example string'`,
            messageText: 'do not cite'
          },
          {
            matchedCode: `q['cite'] = 'some example string'`,
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

      expect(results).toHaveFailuresMatching(
          {matchedCode: `q.cite = 'exampleA'`, messageText: 'do not cite'},
          {matchedCode: `q.cite = 'exampleB'`, messageText: 'do not cite'}, {
            matchedCode: `q.cite = /* test2 */ 'exampleC'`,
            messageText: 'do not cite'
          });
    });

    it('understands function prototypes', () => {
      const source = [
        `function foo(q:HTMLQuoteElement) {`,
        `    q.cite = 'some example string';`,
        `}`,
      ].join('\n');
      const results = compileAndCheck(rule, source);

      expect(results).toHaveFailuresMatching({
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

      expect(results).toHaveFailuresMatching({
        matchedCode: 'q.cite = window.name',
        fileName: 'file_1.ts',
        messageText: 'do not cite',
      });
    });

    it('understands shadowing', () => {
      const source = [
        `const q = document.createElement('q');`,
        `const f1 = (q: {cite: string}) => { q.cite = 'example 1'; };`,
      ].join('\n');
      const rule = new ConformancePatternRule(config);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveNoFailures();
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
      const configOnParent = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'found write to x',
        kind: PatternKind.BANNED_PROPERTY_WRITE,
        values: ['Parent.prototype.x']
      };
      const ruleOnParent = new ConformancePatternRule(configOnParent);
      const results = compileAndCheck(ruleOnParent, source);

      expect(results).toHaveFailuresMatching(expectedFailure);
    });

    it('banning Child.x matches x defined on Parent', () => {
      const configOnChild = {
        errorCode: ErrorCode.CONFORMANCE_PATTERN,
        errorMessage: 'found write to x',
        kind: PatternKind.BANNED_PROPERTY_WRITE,
        values: ['Child.prototype.x']
      };
      const ruleOnChild = new ConformancePatternRule(configOnChild);
      const results = compileAndCheck(ruleOnChild, source);

      expect(results).toHaveFailuresMatching(expectedFailure);
    });
  });
});

beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

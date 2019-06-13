import 'jasmine';
import * as ts from 'typescript';
import {Fix} from '../../failure';
import {ConformancePatternRule, PatternKind} from '../../rules/conformance_pattern_rule';
import {buildReplacementFixer, Fixer} from '../../util/fixer';
import {compileAndCheck, customMatchers} from '../../util/testing/test_support';

const uppercaseFixer: Fixer = {
  getFixForFlaggedNode(node: ts.Node): Fix {
    return {
      changes: [{
        start: node.getStart(),
        end: node.getEnd(),
        replacement: node.getText().toUpperCase(),
        sourceFile: node.getSourceFile(),
      }]
    };
  }
};

const uppercaseFixerBuilt: Fixer = buildReplacementFixer((node: ts.Node) => {
  return {replaceWith: node.getText().toUpperCase()};
})

describe('ConformancePatternRule\'s fixer', () => {
  describe('Generates basic fixes', () => {
    const source = `export {};\n` +
        `const q = document.createElement('q');\n` +
        `q.cite = 'some example string';\n`;

    // The initial config off which we run those checks.
    const baseConfig = {
      errorMessage: 'found citation',
      kind: PatternKind.BANNED_PROPERTY_WRITE,
      values: ['HTMLQuoteElement.prototype.cite'],
    };

    it('for a single match', () => {
      const rule = new ConformancePatternRule(baseConfig, uppercaseFixer);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveNFailures(1, baseConfig);
      expect(results[0]).toBeFailureMatching({
        matchedCode: `q.cite = 'some example string'`,
        messageText: 'found citation'
      });
      expect(results[0]).toHaveFixMatching([
        {start: 50, end: 80, replacement: `Q.CITE = 'SOME EXAMPLE STRING'`}
      ]);
    });


    it('for a single match (alternate fixer)', () => {
      const rule = new ConformancePatternRule(baseConfig, uppercaseFixerBuilt);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveNFailures(1, baseConfig);
      expect(results[0]).toBeFailureMatching({
        matchedCode: `q.cite = 'some example string'`,
        messageText: 'found citation'
      });
      expect(results[0]).toHaveFixMatching([
        {start: 50, end: 80, replacement: `Q.CITE = 'SOME EXAMPLE STRING'`}
      ]);
    });

    it('for several matches', () => {
      const rule = new ConformancePatternRule(baseConfig, uppercaseFixer);
      const sourceTwoMatches =
          source + `q.cite = 'some other example string';\n`;
      const results = compileAndCheck(rule, sourceTwoMatches);

      expect(results).toHaveNFailures(2, baseConfig);
      expect(results[0]).toBeFailureMatching({
        matchedCode: `q.cite = 'some example string'`,
        messageText: 'found citation'
      });
      expect(results[1]).toBeFailureMatching({
        matchedCode: `q.cite = 'some other example string'`,
        messageText: 'found citation'
      });
      expect(results[0]).toHaveFixMatching([
        {start: 50, end: 80, replacement: `Q.CITE = 'SOME EXAMPLE STRING'`}
      ]);
      expect(results[1]).toHaveFixMatching([{
        start: 82,
        end: 118,
        replacement: `Q.CITE = 'SOME OTHER EXAMPLE STRING'`
      }]);
    });
  });
});

beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

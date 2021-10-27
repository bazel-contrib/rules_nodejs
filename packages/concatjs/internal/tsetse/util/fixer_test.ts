import 'jasmine';
import * as ts from 'typescript';
import {Failure, Fix} from '../failure';
import {ConformancePatternRule, ErrorCode, PatternKind} from '../rules/conformance_pattern_rule';
import {buildReplacementFixer, Fixer, maybeAddNamedImport, maybeAddNamespaceImport} from './fixer';
import {compile, compileAndCheck, customMatchers} from './testing/test_support';

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
});

// The initial config and source off which we run those checks.
const baseConfig = {
  errorCode: ErrorCode.CONFORMANCE_PATTERN,
  errorMessage: 'found citation',
  kind: PatternKind.BANNED_PROPERTY_WRITE,
  values: ['HTMLQuoteElement.prototype.cite'],
};

const source = `export {};\n` +
    `const q = document.createElement('q');\n` +
    `q.cite = 'some example string';\n`;

describe('ConformancePatternRule\'s fixer', () => {
  describe('Generates basic fixes', () => {
    it('for a single match', () => {
      const rule = new ConformancePatternRule(baseConfig, uppercaseFixer);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveFailuresMatching({
        matchedCode: `q.cite = 'some example string'`,
        messageText: 'found citation',
        fix: [
          {start: 50, end: 80, replacement: `Q.CITE = 'SOME EXAMPLE STRING'`}
        ]
      });
    });

    it('for a single match (alternate fixer)', () => {
      const rule = new ConformancePatternRule(baseConfig, uppercaseFixerBuilt);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveFailuresMatching({
        matchedCode: `q.cite = 'some example string'`,
        messageText: 'found citation',
        fix: [
          {start: 50, end: 80, replacement: `Q.CITE = 'SOME EXAMPLE STRING'`}
        ]
      });
    });

    it('for several matches', () => {
      const rule = new ConformancePatternRule(baseConfig, uppercaseFixer);
      const sourceTwoMatches =
          source + `q.cite = 'some other example string';\n`;
      const results = compileAndCheck(rule, sourceTwoMatches);

      expect(results).toHaveFailuresMatching(
          {
            matchedCode: `q.cite = 'some example string'`,
            messageText: 'found citation',
            fix: [{
              start: 50,
              end: 80,
              replacement: `Q.CITE = 'SOME EXAMPLE STRING'`
            }]
          },
          {
            matchedCode: `q.cite = 'some other example string'`,
            messageText: 'found citation',
            fix: [{
              start: 82,
              end: 118,
              replacement: `Q.CITE = 'SOME OTHER EXAMPLE STRING'`
            }]
          });

      expect(results[0].fixToReadableStringInContext())
          .toBe(
              `Suggested fix:\n` +
              `- Replace the full match with: Q.CITE = 'SOME EXAMPLE STRING'`);
      expect(results[1].fixToReadableStringInContext())
          .toBe(
              `Suggested fix:\n` +
              `- Replace the full match with: Q.CITE = 'SOME OTHER EXAMPLE STRING'`);
    });
  });

  describe('adds imports', () => {
    const addNamedImportFixer: Fixer = {
      getFixForFlaggedNode(n: ts.Node): Fix |
      undefined {
        const changes = [];
        const ic1 =
            maybeAddNamedImport(n.getSourceFile(), 'foo', './file_1', 'bar');
        if (ic1) {
          changes.push(ic1);
        }
        const ic2 =
            maybeAddNamedImport(n.getSourceFile(), 'foo2', './file_2', 'bar2');
        if (ic2) {
          changes.push(ic2);
        }
        return changes.length ? {changes} : undefined;
      }
    };

    it('maybeAddNamedImport additions', () => {
      const results = compileAndCheck(
          new ConformancePatternRule(baseConfig, addNamedImportFixer), source);

      expect(results[0]).toHaveFixMatching([
        {
          start: 0,
          end: 0,
          replacement: `import {foo as bar} from './file_1';\n`
        },
        {
          start: 0,
          end: 0,
          replacement: `import {foo2 as bar2} from './file_2';\n`
        }
      ]);
      expect(results[0].fixToReadableStringInContext())
          .toBe(
              `Suggested fix:\n` +
              `- Add new import: import {foo as bar} from './file_1';\n` +
              `- Add new import: import {foo2 as bar2} from './file_2';`);
    });

    it('maybeAddNamedImport already there', () => {
      const results = compileAndCheck(
          new ConformancePatternRule(baseConfig, addNamedImportFixer),
          'import {foo as bar} from \'./file_1\';\n' + source,
          'export const foo = 1;');

      expect(results[0]).toHaveFixMatching([{
        start: 37,
        end: 37,
        replacement: `import {foo2 as bar2} from './file_2';\n`
      }]);
      expect(results[0].fixToReadableStringInContext())
          .toBe(
              `Suggested fix:\n` +
              `- Add new import: import {foo2 as bar2} from './file_2';`);
    });

    it('maybeAddNamedImport different name', () => {
      const results = compileAndCheck(
          new ConformancePatternRule(baseConfig, addNamedImportFixer),
          'import {foo as baz} from \'./file_1\';\n' + source,
          'export const foo = 1;');

      expect(results[0]).toHaveFixMatching([
        {start: 8, end: 8, replacement: `foo as bar, `}, {
          start: 37,
          end: 37,
          replacement: `import {foo2 as bar2} from './file_2';\n`
        }
      ]);
      expect(results[0].fixToReadableStringInContext())
          .toBe(
              `Suggested fix:\n` +
              `- Insert at line 1, char 9: foo as bar,\n` +
              `- Add new import: import {foo2 as bar2} from './file_2';`);
    });

    it('maybeAddNamespacedImport', () => {
      const addNamespacedImportFixer: Fixer = {
        getFixForFlaggedNode(n: ts.Node): Fix |
        undefined {
          const ic =
              maybeAddNamespaceImport(n.getSourceFile(), './file_1', 'foo');
          if (ic) return {changes: [ic]};
          return;
        }
      };
      const results = compileAndCheck(
          new ConformancePatternRule(baseConfig, addNamespacedImportFixer),
          source);

      expect(results[0]).toHaveFixMatching([
        {start: 0, end: 0, replacement: `import * as foo from './file_1';\n`}
      ]);
    });
  });

  describe('the logic for location->text transforms', () => {
    const sourceFile = compile(`let a;\nlet b;\n`)
                           .getSourceFiles()
                           .filter(f => f.fileName.indexOf('file_0') !== -1)[0];
    // let a;\nlet b;\n
    // 0123456 7890123  Positions
    // 1234567 1234567  Expected result in characters

    it('stringifies as expected', () => {
      // Only the sourceFile matters here.
      const failure = new Failure(sourceFile, NaN, NaN, 'whatever', NaN);

      expect(failure.readableRange(0, 0)).toBe('at line 1, char 1');
      expect(failure.readableRange(1, 1)).toBe('at line 1, char 2');
      expect(failure.readableRange(0, 1)).toBe('line 1, from char 1 to 2');
      expect(failure.readableRange(0, 1)).toBe('line 1, from char 1 to 2');
      expect(failure.readableRange(7, 7)).toBe('at line 2, char 1');
      expect(failure.readableRange(0, 7))
          .toBe('from line 1, char 1 to line 2, char 1');
    });
  });
});



beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

import 'jasmine';
import {isInStockLibraries} from './ast_tools';
import {isLiteral} from './is_literal';
import {compile} from './testing/test_support';

describe('isLiteral', () => {
  // Different platforms pull in different files (or from different
  // paths) when compiling a .ts file. We only want to inspect source
  // defined in the tests. This pattern is determinted by `compile`.
  const testSrcNamePattern = /file_\d+.ts$/;

  it('understands constants', () => {
    // Keep these to single-expression programs.
    const constantExpressionsSources = [
      `'hello'`,
      `'hello' + 'hi'`,
      `1`,
      `1 + 1`,
      '`abcdef`',
      '`abcd${"ef"}`',
      '`abcd${1+1}`+`hi`',
      `1 ? 'hi' : 'hello'`,
      `window.name ? 'hi' : 'hello'`,
    ];

    // We don't bother with a rule for this one.
    const constantProgram = compile(...constantExpressionsSources);
    const constantCompiledSources = constantProgram.getSourceFiles();

    const constantExpressions =
        constantCompiledSources.filter(s => testSrcNamePattern.test(s.fileName))
            .map(s => s.statements[0].getChildren()[0]);

    const constantTc = constantProgram.getTypeChecker();
    for (const expr of constantExpressions) {
      expect(isLiteral(constantTc, expr))
          .toBe(
              true,
              `Expected "${expr.getFullText()}" to be considered constant.`);
    }
  });

  it('understands non-constants', () => {
    const nonconstantExpressionsSources = [
      `window.name`,
      `'hello' + window.name`,
      `window.name + 'hello'`,
      '`abcd${window.name}`',
      `1 ? window.name : 'hello'`,
      `1 ? 'hello' : window.name`,
    ];

    const nonconstantProgram = compile(...nonconstantExpressionsSources);
    const nonconstantCompiledSources = nonconstantProgram.getSourceFiles();
    const nonconstantTc = nonconstantProgram.getTypeChecker();
    const nonconstantExpressions =
        nonconstantCompiledSources
            .filter(s => testSrcNamePattern.test(s.fileName))
            .map(s => s.statements[0].getChildren()[0]);

    for (const expr of nonconstantExpressions) {
      expect(isLiteral(nonconstantTc, expr))
          .toBe(
              false,
              `Expected "${
                  expr.getFullText()}" not to be considered constant.`);
    }
  });
});

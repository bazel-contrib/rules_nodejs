/**
 * @fileoverview Tests for the various utilities that are not tied to a single
 * rule.
 */

import 'jasmine';
import {ConformancePatternRule, PatternKind} from '../../rules/conformance_pattern_rule';
import {isInStockLibraries, setDebug} from '../../util/ast_tools';
import {isLiteral} from '../../util/is_literal';
import {compile, compileAndCheck} from '../../util/testing/test_support';

describe('Debug output', () => {
  it('turns on and off', () => {
    const source = `const obj = {prop:'val'}; obj.prop = 'foo';`;
    const rule = new ConformancePatternRule({
      errorMessage: 'does not matter',
      kind: PatternKind.BANNED_PROPERTY_WRITE,
      values: ['HTMLQuoteElement.prototype.cite']
    });

    const logs: string[] = [];
    const realConsoleLog = console.log;
    spyOn(console, 'log').and.callFake((s: string) => {
      logs.push(s);
      realConsoleLog(s);
    });
    setDebug(true);
    compileAndCheck(rule, source);

    expect(logs).toEqual([`inspecting obj.prop = 'foo'`]);

    setDebug(false);
    compileAndCheck(rule, source);

    // Nothing more appended: debug was false
    expect(logs).toEqual([`inspecting obj.prop = 'foo'`]);
  });
});

describe('The constant-ness logic', () => {
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
    const constantTc = constantProgram.getTypeChecker();
    const constantExpressions =
        constantCompiledSources.filter(s => !isInStockLibraries(s))
            .map(s => s.statements[0].getChildren()[0]);

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
        nonconstantCompiledSources.filter(s => !isInStockLibraries(s))
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

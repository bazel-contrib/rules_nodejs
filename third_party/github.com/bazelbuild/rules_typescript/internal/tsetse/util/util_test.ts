/**
 * @fileoverview Tests for the various utilities that are not tied to a single
 * rule.
 */

import 'jasmine';
import {ConformancePatternRule, PatternKind} from '../rules/conformance_pattern_rule';
import {isInStockLibraries, setDebug} from './ast_tools';
import {isLiteral} from './is_literal';
import {compile, compileAndCheck} from './testing/test_support';

describe('Debug output', () => {
  it('turns on and off', () => {
    const source = `location.href = 'foo';`;
    const rule = new ConformancePatternRule({
      errorMessage: 'does not matter',
      kind: PatternKind.BANNED_PROPERTY_WRITE,
      values: ['Location.prototype.href']
    });

    const logs: string[] = [];
    const realConsoleLog = console.log;
    spyOn(console, 'log').and.callFake((s: string) => {
      logs.push(s);
      realConsoleLog(s);
    });
    setDebug(true);
    compileAndCheck(rule, source);

    expect(logs).toEqual([`inspecting location.href = 'foo'`]);

    setDebug(false);
    compileAndCheck(rule, source);

    // Nothing more appended: debug was false
    expect(logs).toEqual([`inspecting location.href = 'foo'`]);
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

describe('test AbsoluteMatcher', () => {
  it('requires a scope', () => {
    const config = {
      errorMessage: 'banned name with no scope',
      kind: PatternKind.BANNED_NAME,
      values: ['exec']
    };
    const sources = [`eval('alert("hi");');`];

    const check = () =>
        compileAndCheck(new ConformancePatternRule(config), ...sources);

    expect(check).toThrowError('Malformed matcher selector.');
  });

  it('matched path', () => {

    const config = {
      errorMessage: 'banned name with file path',
      kind: PatternKind.BANNED_NAME,
      values: ['./file_0|Foo.bar']
    };
    const sources = [
      `export class Foo { static bar(s: string) {return s + "abc";} }`,
      `import {Foo} from './file_0';
       var a = Foo.bar("123");`
    ];
    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);

    expect(results).toHaveFailuresMatching(
        {matchedCode: `bar`, messageText: 'banned name with file path'});
  });

  it('unmatched path', () => {
    const config = {
      errorMessage: 'banned name with file path',
      kind: PatternKind.BANNED_NAME,
      values: ['./file_0|Foo.bar']
    };
    const sources = [
      `export class Foo { static bar(s: string) {return s + "abc";} }`,
      `export class Foo { static bar(s: string) {return s + "abc";} }`,
      `import {Foo} from './file_1';
       var a = Foo.bar("123");`
    ];

    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);
    expect(results).toHaveNoFailures();
  });

  it('local exported definition', () => {
    // This is a match because Foo.bar is an exported symbol.
    const config = {
      errorMessage: 'banned name with file path',
      kind: PatternKind.BANNED_NAME,
      values: ['./file_0|Foo.bar']
    };
    const sources =
        [`export class Foo { static bar(s: string) {return s + "abc";} }
          var a = Foo.bar("123");`];

    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);
    expect(results).toHaveFailuresMatching(
        {matchedCode: `bar`, messageText: 'banned name with file path'});
  });

  it('global definition', () => {
    const config = {
      errorMessage: 'banned ambient name',
      kind: PatternKind.BANNED_NAME,
      values: ['GLOBAL|eval']
    };
    const sources = [`eval('alert("hi");');`];

    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);
    expect(results).toHaveFailuresMatching(
        {matchedCode: `eval`, messageText: 'banned ambient name'});
  });

  it('global definition with the same name as a custom method', () => {
    const config = {
      errorMessage: 'banned ambient name',
      kind: PatternKind.BANNED_NAME,
      values: ['GLOBAL|eval']
    };
    const sources =
        [`export class Foo { static eval(s: string) { return s + "abc";} }
          var a = Foo.eval("123");`];

    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);
    expect(results).toHaveNoFailures();
  });

  it('local non-exported definition', () => {
    // This is not a match because Foo.bar is a non-exported locally defined
    // symbol.
    const config = {
      errorMessage: 'banned name with file path',
      kind: PatternKind.BANNED_NAME,
      values: ['./file_0|Foo.bar']
    };
    const sources = [`class Foo { static bar(s: string) {return s + "abc";} }
                      var a = Foo.bar("123");`];
    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);
    expect(results).toHaveNoFailures();
  });

  it('property test 1', () => {
    const config = {
      errorMessage: 'banned name with file path',
      kind: PatternKind.BANNED_NAME,
      values: ['./file_0|Foo.s']
    };
    const sources = [
      `export class Foo { static s : string; }`,
      `import {Foo} from './file_0';
       var a = Foo.s;`,
    ];

    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);
    expect(results).toHaveFailuresMatching(
        {matchedCode: `s`, messageText: 'banned name with file path'});
  });

  it('property test 2', () => {
    // This is a match because Moo inherits s from Foo.
    const config = {
      errorMessage: 'banned name with file path',
      kind: PatternKind.BANNED_NAME,
      values: ['./file_0|Foo.s']
    };
    const sources = [
      `export class Foo { static s : string; }`,
      `import {Foo} from './file_0';
       export class Moo extends Foo { static t : string; }`,
      `import {Moo} from './file_1';
       var a = Moo.s;`,
    ];

    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);
    expect(results).toHaveFailuresMatching(
        {matchedCode: `s`, messageText: 'banned name with file path'});
  });

  it('property test 3', () => {
    // This is not a match because Moo redefines s.
    const config = {
      errorMessage: 'banned name with file path',
      kind: PatternKind.BANNED_NAME,
      values: ['./file_0|Foo.s']
    };
    const sources = [
      `export class Foo { static s : string; }`,
      `import {Foo} from './file_0';
       export class Moo extends Foo { static s : string; }`,
      `import {Moo} from './file_1';
       var a = Moo.s;`,
    ];

    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);
    expect(results).toHaveNoFailures();
  });

  it('Property of type defined in in-stock library', () => {
    const config = {
      errorMessage: 'banned name without file path',
      kind: PatternKind.BANNED_NAME,
      values: ['GLOBAL|open']
    };
    const sources = [
      'const elem = new XMLHttpRequest();',
      'elem.open("get", "url");',  // FQN of elem.open is XMLHttpRequest.open
                                   // and shouldn't be banned
    ];

    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);
    expect(results).toHaveNoFailures();
  });

  it('inheritance test 1', () => {
    // This is a match because Moo inherits bar from Foo.
    const config = {
      errorMessage: 'banned name with file path',
      kind: PatternKind.BANNED_NAME,
      values: ['./file_0|Foo.bar']
    };
    const sources = [
      `export class Foo { static bar(s: string) {return s + "abc";} }`,
      `import {Foo} from './file_0';
       export class Moo extends Foo { static far(s: string) {return s + "def";} }`,
      `import {Moo} from './file_1';
       Moo.bar("abc");`
    ];

    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);
    expect(results).toHaveFailuresMatching(
        {matchedCode: `bar`, messageText: 'banned name with file path'});
  });

  it('inheritance test 2', () => {
    // This is not a match because Moo redefines bar.
    const config = {
      errorMessage: 'banned name with file path',
      kind: PatternKind.BANNED_NAME,
      values: ['./file_0|Foo.bar']
    };
    const sources = [
      `export class Foo { static bar(s: string) {return s + "abc";} }
       export class Moo extends Foo { static bar(s: string) {return s + "def";} }`,
      `import {Foo, Moo} from './file_0';
       Moo.bar("abc");`
    ];

    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);
    expect(results).toHaveNoFailures();
  });

  it('interface', () => {
    // This is not a match because even though bar specified is interface Moo,
    // its actual definition is in class Boo.
    const config = {
      errorMessage: 'banned name with file path',
      kind: PatternKind.BANNED_NAME,
      values: ['./file_1|Moo.bar']
    };
    const sources = [
      `export class Foo { static bar(s: string) {return s + "abc";} }`,
      `import {Foo} from './file_0';
       export interface Moo extends Foo { }`,
      `import {Moo} from './file_1';
       export class Boo implements Moo { static bar(s: string) {return s + "def";} }`,
      `import {Boo} from './file_2';
       Boo.bar("abc");`,
    ];

    const results =
        compileAndCheck(new ConformancePatternRule(config), ...sources);
    expect(results).toHaveNoFailures();
  });
});

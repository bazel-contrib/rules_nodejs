import 'jasmine';
import {ConformancePatternRule, PatternKind} from '../../rules/conformance_pattern_rule';
import {compileAndCheck, customMatchers} from '../../util/testing/test_support';

describe('BANNED_NAME_CALL_NON_CONSTANT_ARGUMENT', () => {
  const rule = new ConformancePatternRule({
    errorMessage: 'do not call bar.foo with non-literal 1st arg',
    kind: PatternKind.BANNED_NAME_CALL_NON_CONSTANT_ARGUMENT,
    values: ['bar:0']
  });

  it('matches simple examples', () => {
    const sources = [
      `export function bar(x:any, y:any) {}`,
      `import * as foo from './file_0'; ` +
          `foo.bar(1, 1); foo.bar(window.name, 1);`,
    ];
    const results = compileAndCheck(rule, ...sources);

    expect(results.length).toBe(1);
    expect(results[0]).toBeFailureMatching({
      matchedCode: `foo.bar(window.name, 1)`,
      messageText: 'do not call bar.foo with non-literal 1st arg'
    });
  });

  it('looks at the right position', () => {
    const sources = [
      `export function bar(x:any, y:any) {}`,
      `import * as foo from './file_0'; foo.bar(1, window.name);`,
    ];
    const results = compileAndCheck(rule, ...sources);

    expect(results.length).toBe(0);
  });

  it('looks at the right position', () => {
    const rule = new ConformancePatternRule({
      errorMessage: 'non-literal arg',
      kind: PatternKind.BANNED_NAME_CALL_NON_CONSTANT_ARGUMENT,
      values: ['aaa:1', 'bbb:0']
    });

    const sources = [
      `export function aaa(x:any, y:any) {}; export function bbb(x:any) {}`,
      `import * as foo from './file_0'; ` +
          `foo.aaa(1, window.name); foo.bbb(window.name);`,
    ];
    const results = compileAndCheck(rule, ...sources);

    expect(results.length).toBe(2);
    expect(results[0]).toBeFailureMatching({
      matchedCode: `foo.aaa(1, window.name)`,
    });
    expect(results[1]).toBeFailureMatching({
      matchedCode: `foo.bbb(window.name)`,
    });
  });

  it('supports static methods', () => {
    const rule = new ConformancePatternRule({
      errorMessage: 'non-literal arg',
      kind: PatternKind.BANNED_NAME_CALL_NON_CONSTANT_ARGUMENT,
      values: ['Car.buildFromParts:0']
    });

    const sources = [
      `export class Car { static buildFromParts(name:string):void {}; }`,
      `import {Car} from './file_0';\n` +
          `Car.buildFromParts(window.name);\n` +
          `Car.buildFromParts('hello');`,
    ];
    const results = compileAndCheck(rule, ...sources);

    expect(results.length).toBe(1);
    expect(results[0]).toBeFailureMatching({
      matchedCode: `Car.buildFromParts(window.name)`,
    });
  });

  it('supports ambient global methods', () => {
    const rule = new ConformancePatternRule({
      errorMessage: 'non-literal arg',
      kind: PatternKind.BANNED_NAME_CALL_NON_CONSTANT_ARGUMENT,
      values: ['URL.createObjectURL:0']
    });

    const sources = [`URL.createObjectURL(window.name);\n`];
    const results = compileAndCheck(rule, ...sources);

    expect(results.length).toBe(1);
    expect(results[0]).toBeFailureMatching({
      matchedCode: `URL.createObjectURL(window.name)`,
    });
  });

  it('supports ambient global methods', () => {
    const rule = new ConformancePatternRule({
      errorMessage: 'non-literal arg',
      kind: PatternKind.BANNED_NAME_CALL_NON_CONSTANT_ARGUMENT,
      values: ['eval:0']
    });

    const sources = [`eval(window.name);\n`];
    const results = compileAndCheck(rule, ...sources);

    expect(results.length).toBe(1);
    expect(results[0]).toBeFailureMatching({
      matchedCode: `eval(window.name)`,
    });
  });
});

beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

import 'jasmine';
import {ConformancePatternRule, PatternKind} from '../rules/conformance_pattern_rule';
import {setDebug} from './ast_tools';
import {compileAndCheck} from './testing/test_support';

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

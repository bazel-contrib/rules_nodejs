/**
 * @fileoverview Tests for the various utilities that are not tied to a single
 * rule.
 */

import 'jasmine';
import {ConformancePatternRule, PatternKind} from '../../rules/conformance_pattern_rule';
import {setDebug} from '../../util/ast_tools';
import {compileAndCheck} from '../../util/testing/test_support';

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

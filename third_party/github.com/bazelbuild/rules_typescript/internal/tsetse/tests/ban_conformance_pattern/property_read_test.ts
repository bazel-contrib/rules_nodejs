import 'jasmine';

import {ConformancePatternRule, PatternKind} from '../../rules/conformance_pattern_rule';
import {setDebug} from '../../util/ast_tools';
import {compileAndCheck, customMatchers} from '../../util/testing/test_support';

describe('BANNED_PROPERTY_READ', () => {
  describe('simpler matcher tests', () => {
    const config = {
      errorMessage: 'do not read location.href',
      kind: PatternKind.BANNED_PROPERTY_READ,
      values: ['Location.prototype.href']
    };
    const rule = new ConformancePatternRule(config);

    setDebug(true);

    it('check property access from the RHS of an assignment', () => {
      const source = [
        `var x;`,
        `x = location.href;`,
      ];
      const results = compileAndCheck(rule, ...source);

      expect(results).toHaveFailuresMatching({
        matchedCode: `x = location.href`,
        messageText: 'do not read location.href'
      });
    });

    it('check property access from the LHS of an assignment', () => {
      const source = [
        `location.href = 'abc';`,
      ];
      const results = compileAndCheck(rule, ...source);

      expect(results).toHaveNoFailures();
    });

    it('check property access from the LHS of a non-assignment binary operation',
       () => {
         const source = [
           `var x = (location.href == "abc");`,
         ];
         const results = compileAndCheck(rule, ...source);

         expect(results).toHaveFailuresMatching({
           matchedCode: `location.href == "abc"`,
           messageText: 'do not read location.href'
         });
       });

    it('check property access from the RHS of a non-assignment binary operation',
       () => {
         const source = [
           `var x = ("abc" == location.href);`,
         ];
         const results = compileAndCheck(rule, ...source);

         expect(results).toHaveFailuresMatching({
           matchedCode: `"abc" == location.href`,
           messageText: 'do not read location.href'
         });
       });

    it('check property read from variable initializations', () => {
      const source = [
        `var x = location.href;`,
      ];
      const results = compileAndCheck(rule, ...source);

      expect(results).toHaveFailuresMatching({
        matchedCode: `var x = location.href;`,
        messageText: 'do not read location.href'
      });
    });
  });

  describe('advanced type property tests', () => {
    const config = {
      errorMessage: 'do not read window.location',
      kind: PatternKind.BANNED_PROPERTY_READ,
      // global variable `window` is of type `Window & typeof globalThis`,
      // but we can only specify `Window` here. PropertyMatcher should be
      // able to resolve intersection types by itself. See lib.dom.d.ts.
      values: ['Window.prototype.location']
    };
    const rule = new ConformancePatternRule(config);

    it('check property read from variable initializations', () => {
      const source = 'var l = window.location;';
      const results = compileAndCheck(rule, source);

      expect(results).toHaveFailuresMatching({
        matchedCode: 'var l = window.location;',
        messageText: 'do not read window.location'
      });
    });
  });
});

beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

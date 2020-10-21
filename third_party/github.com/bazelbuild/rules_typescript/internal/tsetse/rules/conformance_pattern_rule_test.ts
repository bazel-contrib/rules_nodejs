import 'jasmine';

import {customMatchers} from '../util/testing/test_support';
import {ConformancePatternRule, ErrorCode, PatternKind} from './conformance_pattern_rule';

describe('ConformancePatternRule creation', () => {
  describe('naming', () => {
    const baseConfig = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'do not cite',
      kind: PatternKind.BANNED_PROPERTY_WRITE,
      values: ['HTMLQuoteElement.prototype.cite'],
    };

    it('generates a name by default', () => {
      const rule = new ConformancePatternRule(baseConfig);
      expect(rule.ruleName).toBe('conformance-pattern-banned-property-write');
    });

    it('accepts given names', () => {
      const namedConfig = {name: 'myRuleName', ...baseConfig};
      const rule = new ConformancePatternRule(namedConfig);
      expect(rule.ruleName).toBe('myRuleName');
    });
  });
});

beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

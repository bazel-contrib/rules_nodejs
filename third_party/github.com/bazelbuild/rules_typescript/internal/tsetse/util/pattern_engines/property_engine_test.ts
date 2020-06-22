import 'jasmine';

import {ConformancePatternRule, ErrorCode, PatternKind} from '../../rules/conformance_pattern_rule';
import {compileAndCheck, customMatchers} from '../../util/testing/test_support';

describe('BANNED_PROPERTY', () => {
  beforeEach(() => {
    jasmine.addMatchers(customMatchers);
  });

  it('matches a trivial example', () => {
    const config = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'No Location#href access',
      kind: PatternKind.BANNED_PROPERTY,
      values: ['Location.prototype.href'],
    };
    const source = 'const href = location.href;';
    const results = compileAndCheck(new ConformancePatternRule(config), source);

    expect(results).toHaveFailuresMatching({
      matchedCode: 'location.href',
      messageText: 'No Location#href access',
    });
  });
});

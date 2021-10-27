import 'jasmine';

import {ConformancePatternRule, ErrorCode, PatternKind} from '../../rules/conformance_pattern_rule';
import {compileAndCheck, customMatchers} from '../testing/test_support';

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
    const source = `const href = location.href + location['href'];`;
    const results = compileAndCheck(new ConformancePatternRule(config), source);

    expect(results).toHaveFailuresMatching(
        {
          matchedCode: 'location.href',
          messageText: 'No Location#href access',
        },
        {
          matchedCode: `location['href']`,
          messageText: 'No Location#href access',
        });
  });

  it('matches element access expressions with string literal types', () => {
    const config = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'No Location#href access',
      kind: PatternKind.BANNED_PROPERTY,
      values: ['Location.prototype.href'],
    };
    const source = `declare const key: 'href'; const href = location[key];`;
    const results = compileAndCheck(new ConformancePatternRule(config), source);

    expect(results).toHaveFailuresMatching(
        {matchedCode: 'location[key]', messageText: 'No Location#href access'});
  });
});

import 'jasmine';
import {ConformancePatternRule, ErrorCode, PatternKind} from '../../rules/conformance_pattern_rule';
import {compileAndCheck, customMatchers} from '../../util/testing/test_support';

describe('BANNED_PROPERTY_NON_CONSTANT_WRITE', () => {
  it('matches a trivial example', () => {
    const source = [
      `const q = document.createElement('q');`,
      `q.cite = 'some example string';`,
      `q['cite'] = 'some example string';`,
      `q.cite = window.name;`,
      `q['cite'] = window.name;`,
    ].join('\n');
    const config = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'do not cite dynamically',
      kind: PatternKind.BANNED_PROPERTY_NON_CONSTANT_WRITE,
      values: ['HTMLQuoteElement.prototype.cite']
    };
    const results = compileAndCheck(new ConformancePatternRule(config), source);

    expect(results).toHaveFailuresMatching(
        {
          matchedCode: `q.cite = window.name`,
          messageText: 'do not cite dynamically',
        },
        {
          matchedCode: `q['cite'] = window.name`,
          messageText: 'do not cite dynamically',
        });
  });
});


beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

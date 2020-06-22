import 'jasmine';
import {ConformancePatternRule, ErrorCode, PatternKind} from '../../rules/conformance_pattern_rule';
import {compileAndCheck, customMatchers} from '../../util/testing/test_support';

describe('BANNED_PROPERTY_NON_CONSTANT_WRITE', () => {
  it('matches a trivial example', () => {
    const source = `const q = document.createElement('q');\n` +
        `q.cite = 'some example string';\n` +  // literal
        `q.cite = window.name;\n`;             // non-literal
    const config = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'do not cite dynamically',
      kind: PatternKind.BANNED_PROPERTY_NON_CONSTANT_WRITE,
      values: ['HTMLQuoteElement.prototype.cite']
    };
    const results = compileAndCheck(new ConformancePatternRule(config), source);

    expect(results).toHaveFailuresMatching(
        {start: 71, end: 91, messageText: 'do not cite dynamically'});
  });
});


beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

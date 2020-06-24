import 'jasmine';

import {ConformancePatternRule, ErrorCode, PatternKind} from '../rules/conformance_pattern_rule';

import {ExemptionReason} from './allowlist';
import {compileAndCheck, customMatchers, getTempDirForAllowlist} from './testing/test_support';

const tmpPrefixForAllowlist = getTempDirForAllowlist();
const tmpRegexpForAllowlist =
    `^(?:${getTempDirForAllowlist().replace(/\\/g, '\\\\')})`;


describe('ConformancePatternRule', () => {
  describe('allowlist handling', () => {
    const source = `export {};\n` +
        `const q = document.createElement('q');\n` +
        `q.cite = 'some example string';\n`;

    // The initial config off which we run those checks.
    const baseConfig = {
      errorCode: ErrorCode.CONFORMANCE_PATTERN,
      errorMessage: 'do not cite',
      kind: PatternKind.BANNED_PROPERTY_WRITE,
      values: ['HTMLQuoteElement.prototype.cite'],
    };

    it('matches if no allowlist (sanity check)', () => {
      const config = {...baseConfig, allowlistEntries: []};
      const rule = new ConformancePatternRule(config);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveNFailures(1);
    });

    it('matches if there is an empty allowlist group', () => {
      const config = {
        ...baseConfig,
        allowlistEntries: [{
          reason: ExemptionReason.UNSPECIFIED,
        }]
      };
      const rule = new ConformancePatternRule(config);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveNFailures(1);
    });

    it('respects prefix-based allowlists (matching test)', () => {
      const config = {
        ...baseConfig,
        allowlistEntries: [{
          reason: ExemptionReason.UNSPECIFIED,
          prefix: [tmpPrefixForAllowlist],
        }]
      };
      const rule = new ConformancePatternRule(config);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveNoFailures();
    });

    it('respects prefix-based allowlists (non-matching test)', () => {
      const config = {
        ...baseConfig,
        allowlistEntries: [{
          reason: ExemptionReason.UNSPECIFIED,
          prefix: ['/nowhere in particular/'],
        }]
      };
      const rule = new ConformancePatternRule(config);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveNFailures(1);
    });

    it('respects regex-based allowlists', () => {
      const config = {
        ...baseConfig,
        allowlistEntries: [{
          reason: ExemptionReason.UNSPECIFIED,
          regexp: [`${tmpRegexpForAllowlist}.+/file_0\\.ts`]
        }]
      };
      const rule = new ConformancePatternRule(config);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveNoFailures();
    });

    it('accepts several regex-based allowlists', () => {
      const config = {
        ...baseConfig,
        allowlistEntries: [{
          reason: ExemptionReason.UNSPECIFIED,
          regexp: [
            `${tmpRegexpForAllowlist}.+/file_0\\.ts`,
            `${tmpRegexpForAllowlist}.+/file_1\\.ts`
          ]
        }]
      };
      const rule = new ConformancePatternRule(config);
      // Testing two times the same file so that both regexps match.
      const results = compileAndCheck(rule, source, source);

      expect(results).toHaveNoFailures();
    });

    it('throws on creation of invalid regexps', () => {
      const config = {
        ...baseConfig,
        allowlistEntries: [{
          reason: ExemptionReason.UNSPECIFIED,
          regexp: ['(', '/tmp/', 'foo'],
        }]
      };
      expect(() => {
        // tslint:disable-next-line:no-unused-expression
        new ConformancePatternRule(config);
      }).toThrowError(/Invalid regular expression/);
    });

    it('test memoizer hit', () => {
      const config = {
        ...baseConfig,
        allowlistEntries: [{
          reason: ExemptionReason.UNSPECIFIED,
          regexp: [
            `${tmpRegexpForAllowlist}.+/file_0\\.ts`,
          ]
        }]
      };
      const rule = new ConformancePatternRule(config);
      // Compile the same file twice to make sure memoizer doesn't
      // break things.
      let results = compileAndCheck(rule, source);
      results = results.concat(compileAndCheck(rule, source));

      expect(results).toHaveNoFailures();
    });

    it('test memoizer miss', () => {
      const config = {
        ...baseConfig,
        allowlistEntries: [{
          reason: ExemptionReason.UNSPECIFIED,
          regexp: [
            `${tmpRegexpForAllowlist}.+/file_1\\.ts`,
          ],
          prefix: ['###PrefixNotExist###'],
        }]
      };
      const rule = new ConformancePatternRule(config);
      // Compile the same file twice to make sure memoizer doesn't
      // break things.
      let results = compileAndCheck(rule, source);
      expect(results).toHaveNFailures(1);

      results = compileAndCheck(rule, source);
      expect(results).toHaveNFailures(1);
    });
  });
});

beforeEach(() => {
  jasmine.addMatchers(customMatchers);
});

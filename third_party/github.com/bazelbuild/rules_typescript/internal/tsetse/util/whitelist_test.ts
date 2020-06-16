import 'jasmine';

import {ConformancePatternRule, PatternKind} from '../rules/conformance_pattern_rule';

import {compileAndCheck, customMatchers, getTempDirForWhitelist} from './testing/test_support';
import {WhitelistReason} from './whitelist';

const tmpPrefixForWhitelist = getTempDirForWhitelist();
const tmpRegexpForWhitelist =
    `^(?:${getTempDirForWhitelist().replace(/\\/g, '\\\\')})`;


describe('ConformancePatternRule', () => {
  describe('whitelist handling', () => {
    const source = `export {};\n` +
        `const q = document.createElement('q');\n` +
        `q.cite = 'some example string';\n`;

    // The initial config off which we run those checks.
    const baseConfig = {
      errorMessage: 'do not cite',
      kind: PatternKind.BANNED_PROPERTY_WRITE,
      values: ['HTMLQuoteElement.prototype.cite'],
    };

    it('matches if no whitelist (sanity check)', () => {
      const config = {...baseConfig, whitelistEntries: []};
      const rule = new ConformancePatternRule(config);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveNFailures(1);
    });

    it('matches if there is an empty whitelist group', () => {
      const config = {
        ...baseConfig,
        whitelistEntries: [{
          reason: WhitelistReason.UNSPECIFIED,
        }]
      };
      const rule = new ConformancePatternRule(config);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveNFailures(1);
    });

    it('respects prefix-based whitelists (matching test)', () => {
      const config = {
        ...baseConfig,
        whitelistEntries: [{
          reason: WhitelistReason.UNSPECIFIED,
          prefix: [tmpPrefixForWhitelist],
        }]
      };
      const rule = new ConformancePatternRule(config);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveNoFailures();
    });

    it('respects prefix-based whitelists (non-matching test)', () => {
      const config = {
        ...baseConfig,
        whitelistEntries: [{
          reason: WhitelistReason.UNSPECIFIED,
          prefix: ['/nowhere in particular/'],
        }]
      };
      const rule = new ConformancePatternRule(config);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveNFailures(1);
    });

    it('respects regex-based whitelists', () => {
      const config = {
        ...baseConfig,
        whitelistEntries: [{
          reason: WhitelistReason.UNSPECIFIED,
          regexp: [`${tmpRegexpForWhitelist}.+/file_0\\.ts`]
        }]
      };
      const rule = new ConformancePatternRule(config);
      const results = compileAndCheck(rule, source);

      expect(results).toHaveNoFailures();
    });

    it('accepts several regex-based whitelists', () => {
      const config = {
        ...baseConfig,
        whitelistEntries: [{
          reason: WhitelistReason.UNSPECIFIED,
          regexp: [
            `${tmpRegexpForWhitelist}.+/file_0\\.ts`,
            `${tmpRegexpForWhitelist}.+/file_1\\.ts`
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
        whitelistEntries: [{
          reason: WhitelistReason.UNSPECIFIED,
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
        whitelistEntries: [{
          reason: WhitelistReason.UNSPECIFIED,
          regexp: [
            `${tmpRegexpForWhitelist}.+/file_0\\.ts`,
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
        whitelistEntries: [{
          reason: WhitelistReason.UNSPECIFIED,
          regexp: [
            `${tmpRegexpForWhitelist}.+/file_1\\.ts`,
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

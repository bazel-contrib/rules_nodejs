import {WhitelistEntry} from './whitelist';

/**
 * The list of supported patterns useable in ConformancePatternRule. The
 * patterns whose name match JSConformance patterns should behave similarly (see
 * https://github.com/google/closure-compiler/wiki/JS-Conformance-Framework)
 */
export enum PatternKind {
  /** Ban use of fully distinguished names. */
  BANNED_NAME = 'banned-name',
  /** Ban use of instance properties */
  BANNED_PROPERTY = 'banned-property',
  /**
   * Ban instance property, like BANNED_PROPERTY but where reads of the
   * property are allowed.
   */
  BANNED_PROPERTY_WRITE = 'banned-property-write',
  /**
   * Ban instance property write unless the property is assigned a constant
   * literal.
   */
  BANNED_PROPERTY_NON_CONSTANT_WRITE = 'banned-property-non-constant-write',
}

/**
 * A config for ConformancePatternRule.
 */
export interface Config {
  kind: PatternKind;

  /**
   * Values have a pattern-specific syntax.
   *
   * TODO(rjamet): We'll document them, but for now see each patternKind's
   * tests for examples.
   */
  values: string[];

  /** The error message this pattern will create. */
  errorMessage: string;

  /** A list of whitelist blocks. */
  whitelistEntries?: WhitelistEntry[];

  /**
   * An optional name for that rule, which will be the rule's `ruleName`.
   * Should be lower-dashed-case.
   */
  name?: string;
}

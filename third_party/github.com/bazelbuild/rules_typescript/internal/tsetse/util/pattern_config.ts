import * as ts from 'typescript';

/**
 * The list of supported patterns useable in ConformancePatternRule. The
 * patterns whose name match JSConformance patterns should behave similarly (see
 * https://github.com/google/closure-compiler/wiki/JS-Conformance-Framework)
 */
export enum PatternKind {
  BANNED_PROPERTY_WRITE = 'banned-property-write',
  BANNED_PROPERTY_NON_CONSTANT_WRITE = 'banned-property-non-constant-write'
}

/**
 * A config for ConformancePatternRule.
 */
export interface Config<P extends PatternKind> {
  kind: P;
  /**
   * Values have a pattern-specific syntax.
   *
   * TODO(rjamet): We'll document them, but for now see each patternKind's tests
   * for examples.
   */
  values: string[];
  /** The error message this pattern will create. */
  errorMessage: string;
}

/** Maps the type of nodes that each `PatternType` produces. */
export interface MatchedNodeTypes {
  [PatternKind.BANNED_PROPERTY_WRITE]: ts.BinaryExpression&{
    left: ts.PropertyAccessExpression;
  };
  [PatternKind.BANNED_PROPERTY_NON_CONSTANT_WRITE]: ts.BinaryExpression&{
    left: ts.PropertyAccessExpression;
  };
}

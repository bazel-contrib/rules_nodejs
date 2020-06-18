import {Checker} from '../checker';
import {ErrorCode} from '../error_code';
import {AbstractRule} from '../rule';
import {Fixer} from '../util/fixer';
import {Config, PatternKind} from '../util/pattern_config';
import {NameEngine} from '../util/pattern_engines/name_engine';
import {PatternEngine} from '../util/pattern_engines/pattern_engine';
import {PropertyEngine} from '../util/pattern_engines/property_engine';
import {PropertyNonConstantWriteEngine} from '../util/pattern_engines/property_non_constant_write_engine';
import {PropertyWriteEngine} from '../util/pattern_engines/property_write_engine';


/**
 * Builds a Rule that matches a certain pattern, given as parameter, and
 * that can additionally run a suggested fix generator on the matches.
 *
 * This is templated, mostly to ensure the nodes that have been matched
 * correspond to what the Fixer expects.
 */
export class ConformancePatternRule implements AbstractRule {
  readonly ruleName: string;
  readonly code = ErrorCode.CONFORMANCE_PATTERN;

  private readonly engine: PatternEngine;

  constructor(config: Config, fixer?: Fixer) {
    switch (config.kind) {
      case PatternKind.BANNED_PROPERTY:
        this.engine = new PropertyEngine(config, fixer);
        break;
      case PatternKind.BANNED_PROPERTY_WRITE:
        this.engine = new PropertyWriteEngine(config, fixer);
        break;
      case PatternKind.BANNED_PROPERTY_NON_CONSTANT_WRITE:
        this.engine = new PropertyNonConstantWriteEngine(config, fixer);
        break;
      case PatternKind.BANNED_NAME:
        this.engine = new NameEngine(config, fixer);
        break;
      default:
        throw new Error('Config type not recognized, or not implemented yet.');
    }
    this.ruleName = config.name || `conformance-pattern-${config.kind}`;
  }

  register(checker: Checker) {
    this.engine.register(checker);
  }
}

// Re-exported for convenience when instantiating rules.
/**
 * The list of supported patterns useable in ConformancePatternRule. The
 * patterns whose name match JSConformance patterns should behave similarly (see
 * https://github.com/google/closure-compiler/wiki/JS-Conformance-Framework).
 */
export {PatternKind};

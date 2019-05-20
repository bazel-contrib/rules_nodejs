import {Checker} from '../checker';
import {ErrorCode} from '../error_code';
import {AbstractRule} from '../rule';
import {Fixer} from '../util/fixer';
import {Config, MatchedNodeTypes, PatternKind} from '../util/pattern_config';
import {PatternEngine} from '../util/pattern_engines/pattern_engine';
import {PropertyWriteEngine} from '../util/pattern_engines/property_write_engine';

/**
 * Builds a Rule that matches a certain pattern, given as parameter, and
 * that can additionally run a suggested fix generator on the matches.
 *
 * This is templated, mostly to ensure the nodes that have been matched
 * correspond to what the Fixer expects.
 */
export class ConformancePatternRule<P extends PatternKind> implements
    AbstractRule {
  readonly ruleName: string;
  readonly code = ErrorCode.CONFORMANCE_PATTERN;

  private readonly engine: PatternEngine<P>;

  constructor(
      config: Config<P>, fixer?: Fixer<MatchedNodeTypes[P]>,
      verbose?: boolean) {
    // TODO(rjamet): This cheats a bit with the typing, as TS doesn't realize
    // that P is Config.kind.
    // tslint:disable-next-line:no-any See above.
    let engine: PatternEngine<any>;
    switch (config.kind) {
      case PatternKind.BANNED_PROPERTY_WRITE:
        engine = new PropertyWriteEngine(config, fixer, verbose);
        break;
      default:
        throw new Error('Config type not recognized, or not implemented yet.');
    }
    this.ruleName = `conformance-pattern-${config.kind}`;
    this.engine = engine as PatternEngine<P>;
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

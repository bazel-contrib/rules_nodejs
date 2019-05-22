import {Checker} from '../../checker';
import {Fixer} from '../../util/fixer';
import {Config, MatchedNodeTypes, PatternKind} from '../../util/pattern_config';

/**
 * A patternEngine is the logic that handles a specific PatternKind.
 */
export abstract class PatternEngine<P extends PatternKind> {
  constructor(
      protected readonly config: Config<P>,
      protected readonly fixer?: Fixer<MatchedNodeTypes[P]>) {}

  abstract register(checker: Checker): void;
}

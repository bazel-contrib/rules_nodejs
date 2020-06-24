import * as ts from 'typescript';

import {Checker} from '../../checker';
import {Fix} from '../../failure';
import {Allowlist} from '../../util/allowlist';
import {Fixer} from '../../util/fixer';
import {PatternEngineConfig} from '../../util/pattern_config';
import {shouldExamineNode} from '../ast_tools';

/**
 * A patternEngine is the logic that handles a specific PatternKind.
 */
export abstract class PatternEngine {
  private readonly allowlist: Allowlist;

  constructor(
      protected readonly config: PatternEngineConfig,
      protected readonly fixer?: Fixer) {
    this.allowlist = new Allowlist(config.allowlistEntries);
  }

  /**
   * `register` will be called by the ConformanceRule to tell Tsetse the
   * PatternEngine will handle matching. Implementations should use
   * `checkAndFilterResults` as a wrapper for `check`.
   */
  abstract register(checker: Checker): void;

  /**
   * A composer that wraps checking functions with code handling aspects of the
   * analysis that are not engine-specific, and which defers to the
   * subclass-specific logic afterwards. Subclasses should transform their
   * checking logic with this composer before registered on the checker.
   */
  protected wrapCheckWithAllowlistingAndFixer<T extends ts.Node>(
      checkFunction: (tc: ts.TypeChecker, n: T) => ts.Node |
          undefined): (c: Checker, n: T) => void {
    return (c: Checker, n: T) => {
      const sf = n.getSourceFile();
      if (!shouldExamineNode(n) || sf.isDeclarationFile) {
        return;
      }
      const matchedNode = checkFunction(c.typeChecker, n);
      if (matchedNode && !this.allowlist.isAllowlisted(sf.fileName)) {
        const fix: Fix|undefined = this.fixer ?
            this.fixer.getFixForFlaggedNode(matchedNode) :
            undefined;
        c.addFailureAtNode(matchedNode, this.config.errorMessage, fix);
      }
    }
  }
}

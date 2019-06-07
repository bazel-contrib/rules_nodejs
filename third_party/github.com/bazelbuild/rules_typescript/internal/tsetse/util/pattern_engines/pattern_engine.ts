import * as ts from 'typescript';
import {Checker} from '../../checker';
import {Fix} from '../../failure';
import {Fixer} from '../../util/fixer';
import {Config, MatchedNodeTypes, PatternKind} from '../../util/pattern_config';
import {shouldExamineNode} from '../ast_tools';

/**
 * A patternEngine is the logic that handles a specific PatternKind.
 */
export abstract class PatternEngine<P extends PatternKind> {
  private readonly whitelistedPrefixes: string[] = [];
  private readonly whitelistedRegExps: RegExp[] = [];
  private readonly whitelistMemoizer: Map<string, boolean> = new Map();

  constructor(
      protected readonly config: Config<P>,
      protected readonly fixer?: Fixer<MatchedNodeTypes[P]>) {
    if (config.whitelistEntries) {
      for (const e of config.whitelistEntries) {
        if (e.prefix) {
          this.whitelistedPrefixes =
              this.whitelistedPrefixes.concat(...e.prefix);
        }
        if (e.regexp) {
          this.whitelistedRegExps = this.whitelistedRegExps.concat(
              ...e.regexp.map(r => new RegExp(r)));
        }
      }
    }
  }

  /**
   * `register` will be called by the ConformanceRule to tell Tsetse the
   * PatternEngine will handle matching. Implementations should use
   *`checkAndFilterResults` as a wrapper for `check`.
   **/
  abstract register(checker: Checker): void;

  /**
   * `check` is the PatternEngine subclass-specific matching logic. Overwrite
   * with what the engine looks for, i.e., AST matching. The whitelisting logic
   * and fix generation are handled in `checkAndFilterResults`.
   */
  abstract check(tc: ts.TypeChecker, n: MatchedNodeTypes[P]):
      MatchedNodeTypes[P]|undefined;

  /**
   * A wrapper for `check` that handles aspects of the analysis that are not
   * engine-specific, and which defers to the subclass-specific logic
   * afterwards.
   */
  checkAndFilterResults(c: Checker, n: MatchedNodeTypes[P]) {
    if (!shouldExamineNode(n) || n.getSourceFile().isDeclarationFile) {
      return;
    }
    const matchedNode = this.check(c.typeChecker, n);
    if (matchedNode && !this.isWhitelisted(matchedNode)) {
      const fix: Fix|undefined =
          this.fixer ? this.fixer.getFixForFlaggedNode(matchedNode) : undefined;
      c.addFailureAtNode(matchedNode, this.config.errorMessage, fix);
    }
  }

  isWhitelisted(n: ts.Node): boolean {
    const name: string = n.getSourceFile().fileName;
    if (this.whitelistMemoizer.has(name)) {
      return this.whitelistMemoizer.get(name)!;
    }
    for (const p of this.whitelistedPrefixes) {
      if (name.indexOf(p) == 0) {
        this.whitelistMemoizer.set(name, true);
        return true;
      }
    }
    for (const re of this.whitelistedRegExps) {
      if (re.test(name)) {
        this.whitelistMemoizer.set(name, true);
        return true;
      }
    }
    this.whitelistMemoizer.set(name, false);
    return false;
  }
}

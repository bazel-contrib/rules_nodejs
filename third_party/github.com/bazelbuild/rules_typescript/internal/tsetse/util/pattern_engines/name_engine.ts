import * as ts from 'typescript';
import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {debugLog, shouldExamineNode} from '../ast_tools';
import {Fixer} from '../fixer';
import {AbsoluteMatcher} from '../match_symbol';
import {Config, MatchedNodeTypes, PatternKind} from '../pattern_config';
import {PatternEngine} from './pattern_engine';

export class NameEngine extends PatternEngine<PatternKind.BANNED_NAME> {
  private readonly matcher: AbsoluteMatcher;
  constructor(
      config: Config<PatternKind.BANNED_NAME>,
      fixer?: Fixer<MatchedNodeTypes[PatternKind.BANNED_NAME]>) {
    super(config, fixer);
    // TODO: Support more than one single value here, or even build a
    // multi-pattern engine. This would help for performance.
    if (this.config.values.length !== 1) {
      throw new Error(`BANNED_NAME expects one value, got(${
          this.config.values.join(',')})`);
    }
    this.matcher = new AbsoluteMatcher(this.config.values[0]);
  }

  register(checker: Checker) {
    checker.on(
        ts.SyntaxKind.Identifier, this.checkAndFilterResults.bind(this),
        ErrorCode.CONFORMANCE_PATTERN);
  }
  
  check(tc: ts.TypeChecker, n: MatchedNodeTypes[PatternKind.BANNED_NAME]):
      MatchedNodeTypes[PatternKind.BANNED_NAME]|undefined {
    if (!shouldExamineNode(n) || n.getSourceFile().isDeclarationFile) {
      return;
    }
    debugLog(`inspecting ${n.getText().trim()}`);
    if (!this.matcher.matches(n, tc)) {
      debugLog('Not the right global name.');
      return;
    }
    return n;
  }
}

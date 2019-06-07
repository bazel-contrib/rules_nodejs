import * as ts from 'typescript';
import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {debugLog, isPropertyWriteExpression} from '../ast_tools';
import {Fixer} from '../fixer';
import {PropertyMatcher} from '../match_symbol';
import {Config, MatchedNodeTypes, PatternKind} from '../pattern_config';
import {PatternEngine} from '../pattern_engines/pattern_engine';

// Just for conciseness.
type BanKind = PatternKind.BANNED_PROPERTY_WRITE;

/**
 * The engine for BANNED_PROPERTY_WRITE.
 */
export class PropertyWriteEngine extends PatternEngine<BanKind> {
  private readonly matcher: PropertyMatcher;
  constructor(
      config: Config<BanKind>, fixer?: Fixer<MatchedNodeTypes[BanKind]>) {
    super(config, fixer);
    // TODO: Support more than one single value here, or even build a
    // multi-pattern engine. This would help for performance.
    if (this.config.values.length !== 1) {
      throw new Error(`BANNED_PROPERTY_WRITE expects one value, got(${
          this.config.values.join(',')})`);
    }
    this.matcher = PropertyMatcher.fromSpec(this.config.values[0]);
  }

  register(checker: Checker) {
    checker.on(
        ts.SyntaxKind.BinaryExpression, this.checkAndFilterResults.bind(this),
        ErrorCode.CONFORMANCE_PATTERN);
  }

  check(tc: ts.TypeChecker, n: MatchedNodeTypes[BanKind]):
      MatchedNodeTypes[BanKind]|undefined {
    if (!isPropertyWriteExpression(n)) {
      return;
    }
    debugLog(`inspecting ${n.getText().trim()}`);
    if (!this.matcher.matches(n.left, tc)) {
      return;
    }
    debugLog(`Match. Reporting failure (boundaries: ${n.getStart()}, ${
        n.getEnd()}] on node [${n.getText()}]`);
    return n;
  }
}

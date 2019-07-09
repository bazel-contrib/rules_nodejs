import * as ts from 'typescript';
import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {debugLog, isPropertyWriteExpression} from '../ast_tools';
import {Fixer} from '../fixer';
import {isLiteral} from '../is_literal';
import {PropertyMatcher} from '../match_symbol';
import {Config} from '../pattern_config';
import {PatternEngine} from './pattern_engine';

/**
 * The engine for BANNED_PROPERTY_NON_CONSTANT_WRITE.
 */
export class PropertyNonConstantWriteEngine extends PatternEngine {
  private readonly matcher: PropertyMatcher;
  constructor(config: Config, fixer?: Fixer) {
    super(config, fixer);
    // TODO: Support more than one single value here, or even build a
    // multi-pattern engine. This would help for performance.
    if (this.config.values.length !== 1) {
      throw new Error(
          `BANNED_PROPERTY_NON_CONSTANT_WRITE expects one value, got(${
              this.config.values.join(',')})`);
    }
    this.matcher = PropertyMatcher.fromSpec(this.config.values[0]);
  }

  register(checker: Checker) {
    checker.on(
        ts.SyntaxKind.BinaryExpression, this.checkAndFilterResults.bind(this),
        ErrorCode.CONFORMANCE_PATTERN);
  }

  check(tc: ts.TypeChecker, n: ts.Node): ts.Node|undefined {
    if (!isPropertyWriteExpression(n)) {
      return;
    }
    debugLog(`inspecting ${n.getFullText().trim()}`);
    if (!this.matcher.matches(n.left, tc)) {
      debugLog('Not an assignment to the right property');
      return;
    }
    if (isLiteral(tc, n.right)) {
      debugLog(`Assigned value (${
          n.right.getFullText()}) is a compile-time constant.`);
      return;
    }
    return n;
  }
}

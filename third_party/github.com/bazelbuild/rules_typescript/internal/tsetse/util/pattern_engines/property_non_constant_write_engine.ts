import * as ts from 'typescript';
import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {debugLog, isPropertyWriteExpression} from '../ast_tools';
import {Fixer} from '../fixer';
import {isLiteral} from '../is_literal';
import {PropertyMatcher} from '../match_symbol';
import {Config} from '../pattern_config';
import {PatternEngine} from './pattern_engine';

function checkBinExpr(
    tc: ts.TypeChecker, n: ts.BinaryExpression,
    matcher: PropertyMatcher): ts.Node|undefined {
  if (!isPropertyWriteExpression(n)) {
    return;
  }
  debugLog(`inspecting ${n.getFullText().trim()}`);
  if (!matcher.matches(n.left, tc)) {
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

/**
 * The engine for BANNED_PROPERTY_NON_CONSTANT_WRITE.
 */
export class PropertyNonConstantWriteEngine extends PatternEngine {
  register(checker: Checker) {
    for (const value of this.config.values) {
      const matcher = PropertyMatcher.fromSpec(value);

      checker.on(
          ts.SyntaxKind.BinaryExpression,
          this.wrapCheckWithWhitelistingAndFixer(
              (tc, n: ts.BinaryExpression) => checkBinExpr(tc, n, matcher)),
          ErrorCode.CONFORMANCE_PATTERN);
    }
  }
}

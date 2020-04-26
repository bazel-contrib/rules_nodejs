import * as ts from 'typescript';
import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {debugLog} from '../ast_tools';
import {Fixer} from '../fixer';
import {PropertyMatcher} from '../match_symbol';
import {Config} from '../pattern_config';
import {PatternEngine} from '../pattern_engines/pattern_engine';

/**
 * Check property read in variable initializations. For example, var a =
 * object.property.
 */
function checkVarStmt(
    tc: ts.TypeChecker, n: ts.VariableStatement,
    matcher: PropertyMatcher): ts.Node|undefined {
  for (const declaration of n.declarationList.declarations) {
    if (declaration.initializer !== undefined &&
        ts.isPropertyAccessExpression(declaration.initializer)) {
      debugLog(`Inspecting ${n.getText().trim()}`);
      if (matcher.matches(declaration.initializer, tc)) {
        debugLog(`Match. Reporting failure (boundaries: ${n.getStart()}, ${
            n.getEnd()}] on node [${n.getText()}]`);
        return n;
      }
    }
  }
  return;
}

/**
 * Check property read in binary expressions. If it is an assignment, it is a
 * match if the property access appears at the RHS of the assignment.
 */
function checkBinExpr(
    tc: ts.TypeChecker, n: ts.BinaryExpression,
    matcher: PropertyMatcher): ts.Node|undefined {
  debugLog(`inspecting ${n.getText().trim()}`);
  // If the expression is an assignment, then the property must appear
  // at the right-hand side of the expression.
  if (n.operatorToken.getText().trim() === '=') {
    if (ts.isPropertyAccessExpression(n.right) &&
        matcher.matches(n.right, tc)) {
      debugLog(`Match. Reporting failure (boundaries: ${n.getStart()}, ${
          n.getEnd()}] on node [${n.getText()}]`);
      return n;
    }
  }
  // If it is a non-assignment binary expression,
  // the property access may appear either side of the expression.
  else {
    if ((ts.isPropertyAccessExpression(n.right) &&
         matcher.matches(n.right, tc)) ||
        (ts.isPropertyAccessExpression(n.left) &&
         matcher.matches(n.left, tc))) {
      debugLog(`Match. Reporting failure (boundaries: ${n.getStart()}, ${
          n.getEnd()}] on node [${n.getText()}]`);
      return n;
    }
  }
  return;
}

/**
 * The engine for BANNED_PROPERTY_READ.
 */
export class PropertyReadEngine extends PatternEngine {
  register(checker: Checker) {
    for (const value of this.config.values) {
      const matcher = PropertyMatcher.fromSpec(value);

      checker.on(
          ts.SyntaxKind.VariableStatement,
          this.wrapCheckWithWhitelistingAndFixer(
              (tc, n: ts.VariableStatement) => checkVarStmt(tc, n, matcher)),
          ErrorCode.CONFORMANCE_PATTERN);

      checker.on(
          ts.SyntaxKind.BinaryExpression,
          this.wrapCheckWithWhitelistingAndFixer(
              (tc, n: ts.BinaryExpression) => checkBinExpr(tc, n, matcher)),
          ErrorCode.CONFORMANCE_PATTERN);
    }
  }
}

import * as ts from 'typescript';
import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {debugLog} from '../ast_tools';
import {Fixer} from '../fixer';
import {PropertyMatcher} from '../match_symbol';
import {Config} from '../pattern_config';
import {PatternEngine} from '../pattern_engines/pattern_engine';

/**
 * The engine for BANNED_PROPERTY_READ.
 */
export class PropertyReadEngine extends PatternEngine {
  private readonly matcher: PropertyMatcher;
  constructor(config: Config, fixer?: Fixer) {
    super(config, fixer);
    // TODO: Support more than one single value here, or even build a
    // multi-pattern engine. This would help for performance.
    if (this.config.values.length !== 1) {
      throw new Error(`BANNED_PROPERTY_READ expects one value, got(${
          this.config.values.join(',')})`);
    }
    this.matcher = PropertyMatcher.fromSpec(this.config.values[0]);
  }

  register(checker: Checker) {
    checker.on(
        ts.SyntaxKind.VariableStatement, this.checkAndFilterResults.bind(this),
        ErrorCode.CONFORMANCE_PATTERN);
    checker.on(
        ts.SyntaxKind.BinaryExpression, this.checkAndFilterResults.bind(this),
        ErrorCode.CONFORMANCE_PATTERN);
  }

  check(tc: ts.TypeChecker, n: ts.Node): ts.Node|undefined {
    // Check property read in variable initializations.
    // For example, var a = object.property.
    if (ts.isVariableStatement(n)) {
      for (const declaration of n.declarationList.declarations) {
        if (declaration.initializer !== undefined &&
            ts.isPropertyAccessExpression(declaration.initializer)) {
          debugLog(`Inspecting ${n.getText().trim()}`);
          if (this.matcher.matches(declaration.initializer, tc)) {
            debugLog(`Match. Reporting failure (boundaries: ${n.getStart()}, ${
                n.getEnd()}] on node [${n.getText()}]`);
            return n;
          }
        }
      }
    }

    // Check property read in binary expressions.
    // If it is an assignment, it is a match if the property access
    // appears at the RHS of the assignment.
    if (ts.isBinaryExpression(n)) {
      debugLog(`inspecting ${n.getText().trim()}`);
      // If the expression is an assignment, then the property must appear at
      // the right-hand side of the expression.
      if (n.operatorToken.getText().trim() === '=') {
        if (ts.isPropertyAccessExpression(n.right) &&
            this.matcher.matches(n.right, tc)) {
          debugLog(`Match. Reporting failure (boundaries: ${n.getStart()}, ${
              n.getEnd()}] on node [${n.getText()}]`);
          return n;
        }
      }
      // If it is a non-assignment binary expression,
      // the property access may appear either side of the expression.
      else {
        if ((ts.isPropertyAccessExpression(n.right) &&
             this.matcher.matches(n.right, tc)) ||
            (ts.isPropertyAccessExpression(n.left) &&
             this.matcher.matches(n.left, tc))) {
          debugLog(`Match. Reporting failure (boundaries: ${n.getStart()}, ${
              n.getEnd()}] on node [${n.getText()}]`);
          return n;
        }
      }
    }

    return;
  }
}

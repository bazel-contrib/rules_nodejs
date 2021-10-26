import * as ts from 'typescript';
import {findInChildren} from './ast_tools';

/**
 * Determines if the given ts.Node is literal enough for security purposes. This
 * is true when the value is built from compile-time constants, with a certain
 * tolerance for indirection in order to make this more user-friendly.
 *
 * This considers a few different things. We accept
 * - What TS deems literal (literal strings, literal numbers, literal booleans,
 *   enum literals),
 * - Binary operations of two expressions that we accept (including
 *   concatenation),
 * - Template interpolations of what we accept,
 * - `x?y:z` constructions, if we accept `y` and `z`
 * - Variables that are const, and initialized with an expression we accept
 *
 * And to prevent bypasses, expressions that include casts are not accepted, and
 * this checker does not follow imports.
 */
export function isLiteral(typeChecker: ts.TypeChecker, node: ts.Node): boolean {
  if (ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    // Concatenation is fine, if the parts are literals.
    return (
        isLiteral(typeChecker, node.left) &&
        isLiteral(typeChecker, node.right));
  } else if (ts.isTemplateExpression(node)) {
    // Same for template expressions.
    return node.templateSpans.every(span => {
      return isLiteral(typeChecker, span.expression);
    });
  } else if (ts.isTemplateLiteral(node)) {
    // and literals (in that order).
    return true;
  } else if (ts.isConditionalExpression(node)) {
    return isLiteral(typeChecker, node.whenTrue) &&
        isLiteral(typeChecker, node.whenFalse);
  } else if (ts.isIdentifier(node)) {
    return isUnderlyingValueAStringLiteral(node, typeChecker);
  }

  const hasCasts = findInChildren(node, ts.isAsExpression);

  return !hasCasts && isLiteralAccordingToItsType(typeChecker, node);
}

/**
 * Given an identifier, this function goes around the AST to determine
 * whether we should consider it a string literal, on a best-effort basis. It
 * is an approximation, but should never have false positives.
 */
function isUnderlyingValueAStringLiteral(
    identifier: ts.Identifier, tc: ts.TypeChecker) {
  // The identifier references a value, and we try to follow the trail: if we
  // find a variable declaration for the identifier, and it was declared as a
  // const (so we know it wasn't altered along the way), then the value used
  // in the declaration is the value our identifier references. That means we
  // should look at the value used in its initialization (by applying the same
  // rules as before).
  // Since we're best-effort, if a part of that operation failed due to lack
  // of support (for instance, the identifier was imported), then we fail
  // closed and don't consider the value a literal.

  // TODO(rjamet): This doesn't follow imports, which is a feature that we need
  // in a fair amount of cases.
  return getVariableDeclarationsInSameFile(identifier, tc)
      .filter(isConst)
      .some(d => d.initializer !== undefined && isLiteral(tc, d.initializer));
}

/**
 * Returns whether this thing is a literal based on TS's understanding. This is
 * only looking at the local type, so there's no magic in that function.
 */
function isLiteralAccordingToItsType(
    typeChecker: ts.TypeChecker, node: ts.Node): boolean {
  const nodeType = typeChecker.getTypeAtLocation(node);
  return (nodeType.flags &
          (ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral |
           ts.TypeFlags.BooleanLiteral | ts.TypeFlags.EnumLiteral)) !== 0;
}

/**
 * Follows the symbol behind the given identifier, assuming it is a variable,
 * and return all the variable declarations we can find that match it in the
 * same file.
 */
function getVariableDeclarationsInSameFile(
    node: ts.Identifier, tc: ts.TypeChecker): ts.VariableDeclaration[] {
  const symbol = tc.getSymbolAtLocation(node);
  if (!symbol) {
    return [];
  }
  const decls = symbol.getDeclarations();
  if (!decls) {
    return [];
  }
  return decls.filter(ts.isVariableDeclaration);
}

// Tests whether the given variable declaration is Const.
function isConst(varDecl: ts.VariableDeclaration): boolean {
  return Boolean(
      varDecl && varDecl.parent &&
      ts.isVariableDeclarationList(varDecl.parent) &&
      varDecl.parent.flags & ts.NodeFlags.Const);
}

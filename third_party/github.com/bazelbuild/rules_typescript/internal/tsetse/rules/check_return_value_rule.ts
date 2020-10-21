/**
 * @fileoverview A Tsetse rule that checks the return value of certain functions
 * must be used.
 */

import * as tsutils from 'tsutils';
import * as ts from 'typescript';

import {Checker} from '../checker';
import {ErrorCode} from '../error_code';
import {AbstractRule} from '../rule';

const FAILURE_STRING = 'return value is unused.' +
    '\n\tSee http://tsetse.info/check-return-value';

// A list of well-known functions that the return value must be used. If unused
// then the function call is either a no-op (e.g. 'foo.trim()' foo is unchanged)
// or can be replaced by another (Array.map() should be replaced with a loop or
// Array.forEach() if the return value is unused).
const METHODS_TO_CHECK = new Set<string>([
  ['Array', 'concat'],
  ['Array', 'filter'],
  ['Array', 'map'],
  ['Array', 'slice'],
  ['Function', 'bind'],
  ['Object', 'create'],
  ['string', 'concat'],
  ['string', 'normalize'],
  ['string', 'padStart'],
  ['string', 'padEnd'],
  ['string', 'repeat'],
  ['string', 'slice'],
  ['string', 'split'],
  ['string', 'substr'],
  ['string', 'substring'],
  ['string', 'toLocaleLowerCase'],
  ['string', 'toLocaleUpperCase'],
  ['string', 'toLowerCase'],
  ['string', 'toUpperCase'],
  ['string', 'trim'],
].map(list => list.join('#')));

/** A rule to ensure required return values from common functions are used. */
export class Rule extends AbstractRule {
  static readonly RULE_NAME = 'check-return-value';
  readonly ruleName = Rule.RULE_NAME;
  readonly code = ErrorCode.CHECK_RETURN_VALUE;

  // registers checkCallExpression() function on ts.CallExpression node.
  // TypeScript conformance will traverse the AST of each source file and run
  // checkCallExpression() every time it encounters a ts.CallExpression node.
  register(checker: Checker) {
    checker.on(ts.SyntaxKind.CallExpression, checkCallExpression, this.code);
  }
}

function checkCallExpression(checker: Checker, node: ts.CallExpression) {
  // Short-circuit before using the typechecker if possible, as its expensive.
  // Workaround for https://github.com/Microsoft/TypeScript/issues/27997
  if (tsutils.isExpressionValueUsed(node)) {
    return;
  }

  // Check if this CallExpression is one of the well-known functions and returns
  // a non-void value that is unused.
  const signature = checker.typeChecker.getResolvedSignature(node);
  if (signature !== undefined) {
    const returnType = checker.typeChecker.getReturnTypeOfSignature(signature);
    if (!!(returnType.flags & ts.TypeFlags.Void)) {
      return;
    }
    // Although hasCheckReturnValueJsDoc() is faster than isBlackListed(), it
    // returns false most of the time and thus isBlackListed() would have to run
    // anyway. Therefore we short-circuit hasCheckReturnValueJsDoc().
    if (!isBlackListed(node, checker.typeChecker) &&
        !hasCheckReturnValueJsDoc(node, checker.typeChecker)) {
      return;
    }

    checker.addFailureAtNode(node, FAILURE_STRING);
  }
}

function isBlackListed(node: ts.CallExpression, tc: ts.TypeChecker): boolean {
  type AccessExpression =
      ts.PropertyAccessExpression|ts.ElementAccessExpression;
  switch (node.expression.kind) {
    case ts.SyntaxKind.PropertyAccessExpression:
    case ts.SyntaxKind.ElementAccessExpression:
      // Example: foo.bar() or foo[bar]()
      // expressionNode is foo
      const nodeExpression = (node.expression as AccessExpression).expression;
      const nodeExpressionString = nodeExpression.getText();
      const nodeType = tc.getTypeAtLocation(nodeExpression);

      // nodeTypeString is the string representation of the type of foo
      let nodeTypeString = tc.typeToString(nodeType);
      if (nodeTypeString.endsWith('[]')) {
        nodeTypeString = 'Array';
      }
      if (nodeTypeString === 'ObjectConstructor') {
        nodeTypeString = 'Object';
      }
      if (tsutils.isTypeFlagSet(nodeType, ts.TypeFlags.StringLiteral)) {
        nodeTypeString = 'string';
      }

      // nodeFunction is bar
      let nodeFunction = '';
      if (tsutils.isPropertyAccessExpression(node.expression)) {
        nodeFunction = node.expression.name.getText();
      }
      if (tsutils.isElementAccessExpression(node.expression)) {
        const argument = node.expression.argumentExpression;
        if (argument !== undefined) {
          nodeFunction = argument.getText();
        }
      }

      // Check if 'foo#bar' or `${typeof foo}#bar` is in the blacklist.
      if (METHODS_TO_CHECK.has(`${nodeTypeString}#${nodeFunction}`) ||
          METHODS_TO_CHECK.has(`${nodeExpressionString}#${nodeFunction}`)) {
        return true;
      }

      // For 'str.replace(regexp|substr, newSubstr|function)' only check when
      // the second parameter is 'newSubstr'.
      if ((`${nodeTypeString}#${nodeFunction}` === 'string#replace') ||
          (`${nodeExpressionString}#${nodeFunction}` === 'string#replace')) {
        return node.arguments.length === 2 &&
            !tsutils.isFunctionWithBody(node.arguments[1]);
      }
      break;
    case ts.SyntaxKind.Identifier:
      // Example: foo()
      // We currently don't have functions of this kind in blacklist.
      const identifier = node.expression as ts.Identifier;
      if (METHODS_TO_CHECK.has(identifier.text)) {
        return true;
      }
      break;
    default:
      break;
  }
  return false;
}

function hasCheckReturnValueJsDoc(node: ts.CallExpression, tc: ts.TypeChecker) {
  let symbol = tc.getSymbolAtLocation(node.expression);
  if (symbol === undefined) {
    return false;
  }

  if (tsutils.isSymbolFlagSet(symbol, ts.SymbolFlags.Alias)) {
    symbol = tc.getAliasedSymbol(symbol);
  }

  for (const jsDocTagInfo of symbol.getJsDocTags()) {
    if (jsDocTagInfo.name === 'checkReturnValue') {
      return true;
    }
  }
  return false;
}

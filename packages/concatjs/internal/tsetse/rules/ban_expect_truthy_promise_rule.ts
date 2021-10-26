/**
 * @fileoverview Bans expect(returnsPromise()).toBeTruthy(). Promises are always
 * truthy, and this pattern is likely to be a bug where the developer meant
 * expect(await returnsPromise()).toBeTruthy() and forgot the await.
 */

import * as tsutils from 'tsutils';
import * as ts from 'typescript';

import {Checker} from '../checker';
import {ErrorCode} from '../error_code';
import {AbstractRule} from '../rule';

export class Rule extends AbstractRule {
  static readonly RULE_NAME = 'ban-expect-truthy-promise';
  readonly ruleName = Rule.RULE_NAME;
  readonly code = ErrorCode.BAN_EXPECT_TRUTHY_PROMISE;

  register(checker: Checker) {
    checker.on(
        ts.SyntaxKind.PropertyAccessExpression, checkForTruthy, this.code);
  }
}

function checkForTruthy(checker: Checker, node: ts.PropertyAccessExpression) {
  if (node.name.text !== 'toBeTruthy') {
    return;
  }

  const expectCallNode = getLeftmostNode(node);
  if (!ts.isCallExpression(expectCallNode)) {
    return;
  }

  if (!ts.isIdentifier(expectCallNode.expression) || expectCallNode.expression.text !== 'expect') {
    return;
  }

  if (expectCallNode.arguments.length === 0 || ts.isAwaitExpression(expectCallNode.arguments[0])) {
    return;
  }

  const tc = checker.typeChecker;

  const signature = tc.getResolvedSignature(expectCallNode);
  if (signature === undefined) {
    return;
  }

  const symbol = tc.getReturnTypeOfSignature(signature).getSymbol();
  if (symbol === undefined) {
    return;
  }

  // Only look for methods named expect that return a Matchers
  if (symbol.name !== 'Matchers') {
    return;
  }

  const argType = tc.getTypeAtLocation(expectCallNode.arguments[0]);
  if (!tsutils.isThenableType(tc, expectCallNode.arguments[0], argType)) {
    return;
  }

  checker.addFailureAtNode(
      node,
      `Value passed to expect() is of type ${tc.typeToString(argType)}, which` +
          ` is thenable. Promises are always truthy. Either use toBe(true) or` +
          ` await the value.` +
          `\n\tSee http://tsetse.info/ban-expect-truthy-promise`);
}

function getLeftmostNode(node: ts.PropertyAccessExpression) {
  let current: ts.LeftHandSideExpression|undefined = node;
  while (ts.isPropertyAccessExpression(current)) {
    current = current.expression;
  }
  return current;
}

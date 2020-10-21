/**
 * @fileoverview Bans `== NaN`, `=== NaN`, `!= NaN`, and `!== NaN` in TypeScript
 * code, since no value (including NaN) is equal to NaN.
 */

import * as ts from 'typescript';

import {Checker} from '../checker';
import {ErrorCode} from '../error_code';
import {AbstractRule} from '../rule';

export class Rule extends AbstractRule {
  static readonly RULE_NAME = 'equals-nan';
  readonly ruleName = Rule.RULE_NAME;
  readonly code = ErrorCode.EQUALS_NAN;

  register(checker: Checker) {
    checker.on(
        ts.SyntaxKind.BinaryExpression, checkBinaryExpression, this.code);
  }
}

function checkBinaryExpression(checker: Checker, node: ts.BinaryExpression) {
  const isLeftNaN = ts.isIdentifier(node.left) && node.left.text === 'NaN';
  const isRightNaN = ts.isIdentifier(node.right) && node.right.text === 'NaN';
  if (!isLeftNaN && !isRightNaN) {
    return;
  }

  // We avoid calling getText() on the node.operatorToken because it's slow.
  // Instead, manually map back from the kind to the string form of the operator
  switch (node.operatorToken.kind) {
    case ts.SyntaxKind.EqualsEqualsToken:
      checker.addFailureAtNode(
        node,
        `x == NaN is always false; use isNaN(x) instead`,
      );
      break;
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
      checker.addFailureAtNode(
        node,
        `x === NaN is always false; use isNaN(x) instead`,
      );
      break;
    case ts.SyntaxKind.ExclamationEqualsToken:
      checker.addFailureAtNode(
        node,
        `x != NaN is always true; use !isNaN(x) instead`,
      );
      break;
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      checker.addFailureAtNode(
        node,
        `x !== NaN is always true; use !isNaN(x) instead`,
      );
      break;
    default:
      // We don't care about other operators acting on NaN
      break;
  }
}

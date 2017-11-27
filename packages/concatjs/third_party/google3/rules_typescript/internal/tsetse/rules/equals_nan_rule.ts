/**
 * @fileoverview Bans `== NaN`, `=== NaN`, `!= NaN`, and `!== NaN` in TypeScript
 * code, since no value (including NaN) is equal to NaN.
 */

import * as ts from 'typescript';

import {Checker} from '../checker';
import {ErrorCode} from '../error_code';
import {AbstractRule} from '../rule';

export class Rule extends AbstractRule {
  readonly ruleName = 'equals-nan';
  readonly code = ErrorCode.EQUALS_NAN;

  register(checker: Checker) {
    checker.on(
        ts.SyntaxKind.BinaryExpression, checkBinaryExpression, this.code);
  }
}

function checkBinaryExpression(checker: Checker, node: ts.BinaryExpression) {
  if (node.left.getText() === 'NaN' || node.right.getText() === 'NaN') {
    const operator = node.operatorToken;
    if (operator.kind == ts.SyntaxKind.EqualsEqualsToken ||
        operator.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
      checker.addFailureAtNode(
          node,
          `x ${operator.getText()} NaN is always false; use isNaN(x) instead`);
    }
    if (operator.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        operator.kind === ts.SyntaxKind.ExclamationEqualsToken) {
      checker.addFailureAtNode(
          node,
          `x ${operator.getText()} NaN is always true; use !isNaN(x) instead`);
    }
  }
}

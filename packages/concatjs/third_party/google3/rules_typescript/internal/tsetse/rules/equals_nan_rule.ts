/**
 * @fileoverview Bans `== NaN` and `=== NaN` in TypeScript code, since it is
 * always false for any value.
 */

import * as ts from 'typescript';

import {Checker} from '../checker';
import {ErrorCode} from '../error_code';
import {AbstractRule} from '../rule';

const FAILURE_STRING =
    'x == NaN and x === NaN are always false; use isNaN(x) instead';

export class Rule extends AbstractRule {
  readonly ruleName = 'equals-nan';
  readonly code = ErrorCode.EQUALS_NAN;

  register(checker: Checker) {
    checker.on(
        ts.SyntaxKind.BinaryExpression, checkBinaryExpression, this.code);
  }
}

function checkBinaryExpression(checker: Checker, node: ts.BinaryExpression) {
  if ((node.left.getText() === 'NaN' || node.right.getText() === 'NaN') &&
      (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
       node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken)) {
    checker.addFailureAtNode(node, FAILURE_STRING);
  }
}

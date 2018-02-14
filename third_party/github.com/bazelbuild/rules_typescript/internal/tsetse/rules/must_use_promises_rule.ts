/**
 * @fileoverview A Tsetse rule that checks that all promises in async function
 * blocks are awaited or used.
 */

import * as tsutils from 'tsutils';
import * as ts from 'typescript';

import {Checker} from '../checker';
import {ErrorCode} from '../error_code';
import {AbstractRule} from '../rule';

const FAILURE_STRING =
    'All Promises in async functions must either be awaited or used in an expression.' +
    '\n\tSee http://tsetse.info/must-use-promises';

export class Rule extends AbstractRule {
  readonly ruleName = 'must-use-promises';
  readonly code = ErrorCode.MUST_USE_PROMISES;

  register(checker: Checker) {
    checker.on(ts.SyntaxKind.CallExpression, checkCallExpression, this.code);
  }
}

function checkCallExpression(checker: Checker, node: ts.CallExpression) {
  const signature = checker.typeChecker.getResolvedSignature(node);
  if (signature === undefined) {
    return;
  }

  const returnType = checker.typeChecker.getReturnTypeOfSignature(signature);
  if (!!(returnType.flags & ts.TypeFlags.Void)) {
    return;
  }

  if (tsutils.isExpressionValueUsed(node)) {
    return;
  }

  if (inAsyncFunction(node) &&
      tsutils.isThenableType(checker.typeChecker, node)) {
    checker.addFailureAtNode(node, FAILURE_STRING);
  }
}

function inAsyncFunction(node: ts.Node): boolean {
  const isFunction = tsutils.isFunctionDeclaration(node) ||
      tsutils.isArrowFunction(node) || tsutils.isMethodDeclaration(node) ||
      tsutils.isFunctionExpression(node);
  if (isFunction) {
    return tsutils.hasModifier(node.modifiers, ts.SyntaxKind.AsyncKeyword);
  }
  if (node.parent) {
    return inAsyncFunction(node.parent);
  }
  return false;
}

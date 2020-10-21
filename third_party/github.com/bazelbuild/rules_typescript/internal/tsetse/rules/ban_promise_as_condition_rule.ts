/**
 * @fileoverview Bans using a promise as a condition. Promises are always
 * truthy, and this pattern is likely to be a bug where the developer meant
 * if(await returnsPromise()) {} and forgot the await.
 */

import * as tsutils from 'tsutils';
import * as ts from 'typescript';

import {Checker} from '../checker';
import {ErrorCode} from '../error_code';
import {AbstractRule} from '../rule';

export class Rule extends AbstractRule {
  static readonly RULE_NAME = 'ban-promise-as-condition';
  readonly ruleName = Rule.RULE_NAME;
  readonly code = ErrorCode.BAN_PROMISE_AS_CONDITION;

  register(checker: Checker) {
    checker.on(
        ts.SyntaxKind.ConditionalExpression, checkConditional, this.code);
    checker.on(
        ts.SyntaxKind.BinaryExpression, checkBinaryExpression, this.code);
    checker.on(ts.SyntaxKind.WhileStatement, checkWhileStatement, this.code);
    checker.on(ts.SyntaxKind.IfStatement, checkIfStatement, this.code);
  }
}

/** Error message to display. */
function thenableText(nodeType: string, isVariable: boolean) {
  return `Found a thenable ${isVariable ? 'variable' : 'return value'} being` +
      ` used as ${
             nodeType}. Promises are always truthy, await the value to get` +
      ' a boolean value.';
}

function thenableVariableText(nodeType: string) {
  return thenableText(nodeType, true);
}

function thenableReturnText(nodeType: string) {
  return thenableText(nodeType, false);
}

/** Ternary: prom ? y : z */
function checkConditional(checker: Checker, node: ts.ConditionalExpression) {
  addFailureIfThenableCallExpression(
      checker, node.condition, thenableReturnText('a conditional'));

  addFailureIfThenableIdentifier(
      checker, node.condition, thenableVariableText('a conditional'));
}

/**
 *  Binary expression: prom || y or prom && y. Only check left side because
 *  myThing && myThing.prom seems legitimate.
 */
function checkBinaryExpression(checker: Checker, node: ts.BinaryExpression) {
  if (node.operatorToken.kind !== ts.SyntaxKind.BarBarToken &&
      node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) {
    return;
  }

  addFailureIfThenableCallExpression(
      checker, node.left, thenableReturnText('a binary expression'));

  addFailureIfThenableIdentifier(
      checker, node.left, thenableVariableText('a binary expression'));
}

/** While statement: while (prom) {} */
function checkWhileStatement(checker: Checker, node: ts.WhileStatement) {
  addFailureIfThenableCallExpression(
      checker, node.expression, thenableReturnText('a while statement'));

  addFailureIfThenableIdentifier(
      checker, node.expression, thenableVariableText('a while  statement'));
}

/** If statement: if (prom) {} */
function checkIfStatement(checker: Checker, node: ts.IfStatement) {
  addFailureIfThenableCallExpression(
      checker, node.expression, thenableReturnText('an if statement'));

  addFailureIfThenableIdentifier(
      checker, node.expression, thenableVariableText('an if statement'));
}

/** Helper methods */

function addFailureIfThenableCallExpression(
    checker: Checker, callExpression: ts.Expression, errorMessage: string) {
  if (!tsutils.isCallExpression(callExpression)) {
    return;
  }

  const typeChecker = checker.typeChecker;
  const signature = typeChecker.getResolvedSignature(callExpression);

  // Return value of getResolvedSignature is `Signature | undefined` in ts 3.1
  // so we must check if the return value is valid to compile with ts 3.1.
  if (!signature) {
    throw new Error('Unexpected undefined signature for call expression');
  }

  const returnType = typeChecker.getReturnTypeOfSignature(signature);

  if (isNonFalsyThenableType(typeChecker, callExpression, returnType)) {
    checker.addFailureAtNode(callExpression, errorMessage);
  }
}

function addFailureIfThenableIdentifier(
    checker: Checker, identifier: ts.Expression, errorMessage: string) {
  if (!tsutils.isIdentifier(identifier)) {
    return;
  }

  if (isNonFalsyThenableType(checker.typeChecker, identifier)) {
    checker.addFailureAtNode(identifier, errorMessage);
  }
}

/**
 * If the type is a union type and has a falsy part it may be legitimate to use
 * it as a condition, so allow those through. (e.g. Promise<boolean> | boolean)
 * Otherwise, check if it's thenable. If so it should be awaited.
 */
function isNonFalsyThenableType(
    typeChecker: ts.TypeChecker, node: ts.Expression,
    type = typeChecker.getTypeAtLocation(node)) {
  if (hasFalsyParts(typeChecker.getTypeAtLocation(node))) {
    return false;
  }

  return tsutils.isThenableType(typeChecker, node, type);
}

function hasFalsyParts(type: ts.Type) {
  const typeParts = tsutils.unionTypeParts(type);
  const hasFalsyParts =
      typeParts.filter((part) => tsutils.isFalsyType(part)).length > 0;
  return hasFalsyParts;
}

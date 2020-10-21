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

/** A rule to ensure promises in async functions are awaited or used. */
export class Rule extends AbstractRule {
  static readonly RULE_NAME = 'must-use-promises';
  readonly ruleName = Rule.RULE_NAME;
  readonly code = ErrorCode.MUST_USE_PROMISES;

  register(checker: Checker) {
    checker.on(ts.SyntaxKind.CallExpression, checkCallExpression, this.code);
  }
}

function checkCallExpression(checker: Checker, node: ts.CallExpression) {
  // Short-circuit before using the typechecker if possible, as its expensive.
  // Workaround for https://github.com/Microsoft/TypeScript/issues/27997
  if (tsutils.isExpressionValueUsed(node) || !inAsyncFunction(node)) {
    return;
  }

  if (tsutils.isThenableType(checker.typeChecker, node)) {
    checker.addFailureAtNode(node, FAILURE_STRING);
  }
}

function inAsyncFunction(node: ts.Node): boolean {
  for (let inode = node.parent; inode !== undefined; inode = inode.parent) {
    switch (inode.kind) {
      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.FunctionExpression:
      case ts.SyntaxKind.MethodDeclaration:
        // Potentially async
        return tsutils.hasModifier(inode.modifiers, ts.SyntaxKind.AsyncKeyword);
      case ts.SyntaxKind.GetAccessor:
      case ts.SyntaxKind.SetAccessor:
        // These cannot be async
        return false;
      default:
        // Loop and check parent
        break;
    }
  }

  return false;
}

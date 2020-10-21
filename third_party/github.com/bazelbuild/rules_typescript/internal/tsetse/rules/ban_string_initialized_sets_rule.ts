/**
 * @fileoverview Bans `new Set(<string>)` since it is a potential source of bugs
 * due to strings also implementing `Iterable<string>`.
 */

import * as ts from 'typescript';

import {Checker} from '../checker';
import {ErrorCode} from '../error_code';
import {AbstractRule} from '../rule';

const errorMsg = 'Value passed to Set constructor is a string. This will' +
    ' create a Set of the characters of the string, rather than a Set' +
    ' containing the string. To make a Set of the string, pass an array' +
    ' containing the string. To make a Set of the characters, use \'as\' to ' +
    ' create an Iterable<string>, eg: new Set(myStr as Iterable<string>).';

export class Rule extends AbstractRule {
  static readonly RULE_NAME = 'ban-string-initialized-sets';
  readonly ruleName = Rule.RULE_NAME;
  readonly code = ErrorCode.BAN_STRING_INITIALIZED_SETS;

  register(checker: Checker) {
    checker.on(ts.SyntaxKind.NewExpression, checkNewExpression, this.code);
  }
}

function checkNewExpression(checker: Checker, node: ts.NewExpression) {
  const typeChecker = checker.typeChecker;

  // Check that it's a Set which is being constructed
  const ctorTypeSymbol =
      typeChecker.getTypeAtLocation(node.expression).getSymbol();

  if (!ctorTypeSymbol || ctorTypeSymbol.getEscapedName() !== 'SetConstructor') {
    return;
  }
  const isES2015SetCtor = ctorTypeSymbol.declarations.some((decl) => {
    return sourceFileIsStdLib(decl.getSourceFile());
  });
  if (!isES2015SetCtor) return;

  // If there's no arguments provided, then it's not a string so bail out.
  if (!node.arguments || node.arguments.length !== 1) return;

  // Check the type of the first argument, expanding union & intersection types
  const arg = node.arguments[0];
  const argType = typeChecker.getTypeAtLocation(arg);
  const allTypes = argType.isUnionOrIntersection() ? argType.types : [argType];

  // Checks if the type (or any of the union/intersection types) are either
  // strings or string literals.
  const typeContainsString = allTypes.some((tsType) => {
    return (tsType.getFlags() & ts.TypeFlags.StringLike) !== 0;
  });

  if (!typeContainsString) return;

  checker.addFailureAtNode(arg, errorMsg);
}

function sourceFileIsStdLib(sourceFile: ts.SourceFile) {
  return /lib\.es2015\.(collection|iterable)\.d\.ts$/.test(sourceFile.fileName);
}

import * as ts from 'typescript';

import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {debugLog} from '../ast_tools';
import {Fixer} from '../fixer';
import {isLiteral} from '../is_literal';
import {PropertyMatcher} from '../property_matcher';

import {matchPropertyWrite, PropertyWriteEngine} from './property_write_engine';

function matchPropertyNonConstantWrite(
    tc: ts.TypeChecker,
    n: ts.PropertyAccessExpression|ts.ElementAccessExpression,
    matcher: PropertyMatcher): ts.Node|undefined {
  debugLog(() => `inspecting ${n.getFullText().trim()}`);
  if (matchPropertyWrite(tc, n, matcher) === undefined) {
    return;
  }
  const rval = (n.parent as ts.BinaryExpression).right;
  if (isLiteral(tc, rval)) {
    debugLog(
        () => `Assigned value (${
            rval.getFullText()}) is a compile-time constant.`);
    return;
  }
  return n.parent;
}

/**
 * The engine for BANNED_PROPERTY_NON_CONSTANT_WRITE.
 */
export class PropertyNonConstantWriteEngine extends PropertyWriteEngine {
  register(checker: Checker) {
    this.registerWith(checker, matchPropertyNonConstantWrite);
  }
}

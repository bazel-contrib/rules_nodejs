import * as ts from 'typescript';

import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {AbsoluteMatcher} from '../absolute_matcher';
import {debugLog} from '../ast_tools';
import {Fixer} from '../fixer';
import {isLiteral} from '../is_literal';
import {Config} from '../pattern_config';

import {PatternEngine} from './pattern_engine';

function parseSpec(value: string): [AbsoluteMatcher, number] {
  const [matcherSpec, strPosition] = value.split(':', 2);
  if (!matcherSpec || !strPosition.match('^\\d+$')) {
    throw new Error(`Couldn\'t parse value '${value}'`);
  }
  const position = Number(strPosition);
  return [new AbsoluteMatcher(matcherSpec), position];
}

/**
 * Inspects a particular CallExpression to see if it calls the target
 * function with a non-literal parameter in the target position. Returns
 * that CallExpression if `n` matches the search, undefined otherwise.
 */
function checkCallExpr(
    tc: ts.TypeChecker, n: ts.CallExpression, matcher: AbsoluteMatcher,
    position: number): ts.CallExpression|undefined {
  debugLog(() => `inspecting ${n.getText().trim()}`);

  if (!matcher.matches(n.expression, tc)) {
    debugLog(() => `Wrong symbol, not ${matcher.bannedName}`);
    return;
  }
  if (n.arguments.length < position) {
    debugLog(
        () => `Good symbol, not enough arguments to match (got ${
            n.arguments.length}, want ${position})`);
    return;
  }
  if (isLiteral(tc, n.arguments[position])) {
    debugLog(() => `Good symbol, argument literal`);
    return;
  }
  debugLog(
      () => `Match. Reporting failure (boundaries: ${n.getStart()}, ${
          n.getEnd()}] on node [${n.getText()}]`);
  return n;

  // No match.
  return;
}

/**
 * The engine for BANNED_CALL_NON_CONSTANT_ARGUMENT.
 *
 * This takes any amount of (functionName, argument) position pairs, separated
 * by a colon. The first part matches symbols that were defined on the global
 * scope, and their fields, without going through a prototype chain.
 *
 * For instance, "URL.createObjectURL:0" will target any createObjectURL-named
 * call on a URL-named object (like the ambient URL declared in lib.dom.d.ts),
 * or "Car.buildFromParts:1" will match any buildFromParts reached from a
 * Car-named symbol, including a hypothetical class with a static member
 * function "buildFromParts" that lives in its own module.
 */
export class CallNonConstantArgumentEngine extends PatternEngine {
  register(checker: Checker) {
    for (const value of this.config.values) {
      const [matcher, position] = parseSpec(value);

      checker.on(
          ts.SyntaxKind.CallExpression,
          this.wrapCheckWithWhitelistingAndFixer(
              (tc, n: ts.CallExpression) =>
                  checkCallExpr(tc, n, matcher, position)),
          ErrorCode.CONFORMANCE_PATTERN);
    }
  }
}

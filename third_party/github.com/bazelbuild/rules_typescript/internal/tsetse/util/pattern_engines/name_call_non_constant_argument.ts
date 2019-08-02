import * as ts from 'typescript';
import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {debugLog} from '../ast_tools';
import {Fixer} from '../fixer';
import {isLiteral} from '../is_literal';
import {AbsoluteMatcher} from '../match_symbol';
import {Config} from '../pattern_config';
import {PatternEngine} from './pattern_engine';

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
  private readonly matchers: Array<[AbsoluteMatcher, number]> = [];

  constructor(config: Config, fixer?: Fixer) {
    super(config, fixer);
    for (const v of config.values) {
      const [matcherSpec, strPosition] = v.split(':', 2);
      if (!matcherSpec || !strPosition.match('^\\d+$')) {
        throw new Error('Couldn\'t parse values');
      }
      const position = Number(strPosition);
      this.matchers.push([new AbsoluteMatcher(matcherSpec), position]);
    }
  }

  register(checker: Checker) {
    checker.on(
        ts.SyntaxKind.CallExpression, this.checkAndFilterResults.bind(this),
        ErrorCode.CONFORMANCE_PATTERN);
  }

  check(tc: ts.TypeChecker, n: ts.Node): ts.Node|undefined {
    if (!ts.isCallExpression(n)) {
      debugLog(`Should not happen: node is not a CallExpression`);
      return;
    }
    debugLog(`inspecting ${n.getText().trim()}`);

    /**
     * Inspects a particular CallExpression to see if it calls the target
     * function with a non-literal parameter in the target position. Returns
     * that CallExpression if `n` matches the search, undefined otherwise.
     */
    function checkIndividual(
        n: ts.CallExpression, m: [AbsoluteMatcher, number]): ts.CallExpression|
        undefined {
      if (!m[0].matches(n.expression, tc)) {
        debugLog(`Wrong symbol, not ${m[0].bannedName}`);
        return;
      }
      if (n.arguments.length < m[1]) {
        debugLog(`Good symbol, not enough arguments to match (got ${
            n.arguments.length}, want ${m[1]})`);
        return;
      }
      if (isLiteral(tc, n.arguments[m[1]])) {
        debugLog(`Good symbol, argument literal`);
        return;
      }
      debugLog(`Match. Reporting failure (boundaries: ${n.getStart()}, ${
          n.getEnd()}] on node [${n.getText()}]`);
      return n;
    }

    for (const m of this.matchers) {
      // The first matching matcher will be used.
      const r = checkIndividual(n, m);
      if (r) return r;
    }
    // No match.
    return;
  }
}

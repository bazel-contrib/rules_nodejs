import * as ts from 'typescript';
import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {debugLog, isPropertyWriteExpression} from '../ast_tools';
import {Fixer} from '../fixer';
import {PropertyMatcher} from '../match_symbol';
import {Config} from '../pattern_config';
import {PatternEngine} from '../pattern_engines/pattern_engine';

/**
 * The engine for BANNED_PROPERTY_WRITE.
 */
export class PropertyWriteEngine extends PatternEngine {
  private readonly matcher: PropertyMatcher;
  constructor(config: Config, fixer?: Fixer) {
    super(config, fixer);
    // TODO: Support more than one single value here, or even build a
    // multi-pattern engine. This would help for performance.
    if (this.config.values.length !== 1) {
      throw new Error(`BANNED_PROPERTY_WRITE expects one value, got(${
          this.config.values.join(',')})`);
    }
    this.matcher = PropertyMatcher.fromSpec(this.config.values[0]);
  }

  register(checker: Checker) {
    checker.onNamedPropertyAccess(
        this.matcher.bannedProperty, this.checkAndFilterResults.bind(this),
        ErrorCode.CONFORMANCE_PATTERN);
  }

  check(tc: ts.TypeChecker, n: ts.Node): ts.Node|undefined {
    if (!ts.isPropertyAccessExpression(n)) {
      throw new Error(
          `Should not happen: node is not a PropertyAccessExpression`);
    }

    if (!ts.isBinaryExpression(n.parent)) {
      return;
    }

    if (n.parent.operatorToken.getText().trim() !== '=') {
      return;
    }

    if (n.parent.left !== n) {
      return;
    }

    debugLog(`inspecting ${n.parent.getText().trim()}`);
    if (!this.matcher.matches(n, tc)) {
      return;
    }
    return n.parent;
  }
}

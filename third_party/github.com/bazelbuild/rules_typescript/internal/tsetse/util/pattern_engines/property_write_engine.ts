import * as ts from 'typescript';

import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {debugLog, isPropertyWriteExpression} from '../ast_tools';
import {Fixer} from '../fixer';
import {Config} from '../pattern_config';
import {PatternEngine} from '../pattern_engines/pattern_engine';
import {PropertyMatcher} from '../property_matcher';

function checkPropAccessExpr(
    tc: ts.TypeChecker, n: ts.PropertyAccessExpression,
    matcher: PropertyMatcher): ts.Node|undefined {
  if (!ts.isBinaryExpression(n.parent)) {
    return;
  }

  if (n.parent.operatorToken.getText().trim() !== '=') {
    return;
  }

  if (n.parent.left !== n) {
    return;
  }

  debugLog(() => `inspecting ${n.parent.getText().trim()}`);
  if (!matcher.matches(n, tc)) {
    return;
  }
  return n.parent;
}

/**
 * The engine for BANNED_PROPERTY_WRITE.
 */
export class PropertyWriteEngine extends PatternEngine {
  register(checker: Checker) {
    for (const value of this.config.values) {
      const matcher = PropertyMatcher.fromSpec(value);

      checker.onNamedPropertyAccess(
          matcher.bannedProperty,
          this.wrapCheckWithWhitelistingAndFixer(
              (tc, n: ts.PropertyAccessExpression) =>
                  checkPropAccessExpr(tc, n, matcher)),
          ErrorCode.CONFORMANCE_PATTERN);
    }
  }
}

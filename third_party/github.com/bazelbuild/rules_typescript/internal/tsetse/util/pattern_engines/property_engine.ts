import * as ts from 'typescript';

import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {debugLog} from '../ast_tools';
import {Fixer} from '../fixer';
import {PropertyMatcher} from '../match_symbol';
import {Config} from '../pattern_config';
import {PatternEngine} from '../pattern_engines/pattern_engine';

function checkPropAccessExpr(
    tc: ts.TypeChecker, n: ts.PropertyAccessExpression,
    matcher: PropertyMatcher): ts.Node|undefined {
  debugLog(() => `inspecting ${n.getText().trim()}`);
  if (!matcher.matches(n, tc)) {
    return;
  }
  return n;
}

/**
 * Engine for the BANNED_PROPERTY pattern. It captures accesses to property
 * matching the spec regardless whether it's a read or write.
 */
export class PropertyEngine extends PatternEngine {
  register(checker: Checker) {
    for (const value of this.config.values) {
      const matcher = PropertyMatcher.fromSpec(value);
      // TODO(b/154675140): only plain property access expressions are supported
      // for now. In the future, support more patterns including
      // `location['href']` and `const {href} = location;`. That possibly
      // requires refactoring `PropertyMatcher` or adding new types of matchers.
      checker.onNamedPropertyAccess(
          matcher.bannedProperty,
          this.wrapCheckWithWhitelistingAndFixer(
              (tc, n: ts.PropertyAccessExpression) =>
                  checkPropAccessExpr(tc, n, matcher)),
          ErrorCode.CONFORMANCE_PATTERN);
    }
  }
}

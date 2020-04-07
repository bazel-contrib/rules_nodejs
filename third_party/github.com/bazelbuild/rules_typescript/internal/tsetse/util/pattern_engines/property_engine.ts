import * as ts from 'typescript';

import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {debugLog} from '../ast_tools';
import {Fixer} from '../fixer';
import {PropertyMatcher} from '../match_symbol';
import {Config} from '../pattern_config';
import {PatternEngine} from '../pattern_engines/pattern_engine';

/**
 * Engine for the BANNED_PROPERTY pattern. It captures accesses to property
 * matching the spec regardless whether it's a read or write.
 */
export class PropertyEngine extends PatternEngine {
  private readonly matcher: PropertyMatcher;
  constructor(config: Config, fixer?: Fixer) {
    super(config, fixer);
    // Although noted in other engines, it is difficult to support multiple
    // values within the current design. It may be easier to only allow a single
    // value in the config.
    if (this.config.values.length !== 1) {
      throw new Error(`BANNED_PROPERTY expects one value, got(${
          this.config.values.join(',')})`);
    }
    this.matcher = PropertyMatcher.fromSpec(this.config.values[0]);
  }

  register(checker: Checker) {
    checker.onNamedPropertyAccess(
        this.matcher.bannedProperty, this.checkAndFilterResults.bind(this),
        ErrorCode.CONFORMANCE_PATTERN);
  }

  // TODO(pwng): only plain property access expressions are supported for now.
  // In the future, support more patterns including  `location['href']` and
  // `const {href} = location;`. That possibly requires refactoring
  // `PropertyMatcher` or adding new types of matchers.
  check(tc: ts.TypeChecker, n: ts.Node): ts.Node|undefined {
    if (!ts.isPropertyAccessExpression(n)) {
      throw new Error(
          `Should not happen: node is not a PropertyAccessExpression`);
    }
    debugLog(`inspecting ${n.getText().trim()}`);
    if (!this.matcher.matches(n, tc)) {
      return;
    }
    return n;
  }
}

import * as ts from 'typescript';
import {Checker} from '../../checker';
import {ErrorCode} from '../../error_code';
import {AbsoluteMatcher} from '../absolute_matcher';
import {debugLog} from '../ast_tools';
import {Fixer} from '../fixer';
import {PatternEngine} from './pattern_engine';

function checkId(
    tc: ts.TypeChecker, n: ts.Identifier,
    matcher: AbsoluteMatcher): ts.Identifier|undefined {
  debugLog(() => `inspecting ${n.getText().trim()}`);
  if (!matcher.matches(n, tc)) {
    debugLog(() => 'Not the right global name.');
    return;
  }
  return n;
}

/** Engine for the BANNED_NAME pattern */
export class NameEngine extends PatternEngine {
  register(checker: Checker) {
    for (const value of this.config.values) {
      const matcher = new AbsoluteMatcher(value);

      // `String.prototype.split` only returns emtpy array when both the string
      // and the splitter are empty. Here we should be able to safely assert pop
      // returns a non-null result.
      const bannedIdName = matcher.bannedName.split('.').pop()!;
      checker.onNamedIdentifier(
          bannedIdName,
          this.wrapCheckWithAllowlistingAndFixer(
              (tc, n: ts.Identifier) => checkId(tc, n, matcher)),
          this.config.errorCode);
    }
  }
}

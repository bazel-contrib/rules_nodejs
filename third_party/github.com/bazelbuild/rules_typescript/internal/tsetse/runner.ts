/**
 * @fileoverview Runner is the entry point of running Tsetse checks in compiler.
 */

import * as ts from 'typescript';

import * as perfTrace from '../tsc_wrapped/perf_trace';
import * as pluginApi from '../tsc_wrapped/plugin_api';

import {Checker} from './checker';
import {AbstractRule} from './rule';
import {Rule as BanExpectTruthyPromiseRule} from './rules/ban_expect_truthy_promise_rule';
import {Rule as BanPromiseAsConditionRule} from './rules/ban_promise_as_condition_rule';
import {Rule as BanStringInitializedSetsRule} from './rules/ban_string_initialized_sets_rule';
import {Rule as CheckReturnValueRule} from './rules/check_return_value_rule';
import {Rule as EqualsNanRule} from './rules/equals_nan_rule';
import {Rule as MustTypeAssertJsonParseRule} from './rules/must_type_assert_json_parse_rule';
import {Rule as MustUsePromisesRule} from './rules/must_use_promises_rule';

/**
 * List of Tsetse rules. Shared between the program plugin and the language
 * service plugin.
 */
const ENABLED_RULES: AbstractRule[] = [
  new CheckReturnValueRule(),
  new EqualsNanRule(),
  new BanExpectTruthyPromiseRule(),
  new MustUsePromisesRule(),
  new BanPromiseAsConditionRule(),
  new BanStringInitializedSetsRule(),
  new MustTypeAssertJsonParseRule(),
];

/**
 * The Tsetse check plugin performs compile-time static analysis for TypeScript
 * code.
 */
export class Plugin implements pluginApi.DiagnosticPlugin {
  readonly name = 'tsetse';
  private readonly checker: Checker;
  constructor(program: ts.Program, disabledTsetseRules: string[] = []) {
    this.checker = new Checker(program);
    registerRules(this.checker, disabledTsetseRules);
  }

  getDiagnostics(sourceFile: ts.SourceFile) {
    // Tsetse, in its plugin form, outputs ts.Diagnostic that don't make use
    // of the potential suggested fixes Tsetse generates. These diagnostics are
    // however displayed in context: we can therefore stringify any potential
    // suggested fixes in the error message, so they don't go to waste.
    return this.checker.execute(sourceFile)
        .map(failure => failure.toDiagnosticWithStringifiedFix());
  }
}

export function registerRules(checker: Checker, disabledTsetseRules: string[]) {
  for (const rule of ENABLED_RULES) {
    if (disabledTsetseRules.indexOf(rule.ruleName) === -1) {
      rule.register(checker);
    }
  }
}

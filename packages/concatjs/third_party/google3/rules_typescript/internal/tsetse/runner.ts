/**
 * @fileoverview Runner is the entry point of running Tsetse checks in compiler.
 */

import * as ts from 'typescript';

import * as perfTrace from '../tsc_wrapped/perf_trace';
import * as pluginApi from '../tsc_wrapped/plugin_api';

import {Checker} from './checker';
import {AbstractRule} from './rule';
import {Rule as BanExpectTruthyPromiseRule} from './rules/ban_expect_truthy_promise_rule';
import {Rule as CheckReturnValueRule} from './rules/check_return_value_rule';
import {Rule as EqualsNanRule} from './rules/equals_nan_rule';
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
];

/**
 * The Tsetse check plugin performs compile-time static analysis for TypeScript
 * code.
 */
export const PLUGIN: pluginApi.Plugin = {
  wrap(program: ts.Program, disabledTsetseRules: string[] = []): ts.Program {
    const checker = new Checker(program);
    registerRules(checker, disabledTsetseRules);
    const proxy = pluginApi.createProxy(program);
    proxy.getSemanticDiagnostics = (sourceFile: ts.SourceFile) => {
      const result = [...program.getSemanticDiagnostics(sourceFile)];
      perfTrace.wrap('checkConformance', () => {
        result.push(...checker.execute(sourceFile)
                        .map(failure => failure.toDiagnostic()));
      });
      return result;
    };
    return proxy;
  },
};

export function registerRules(checker: Checker, disabledTsetseRules: string[]) {
  for (const rule of ENABLED_RULES) {
    if (disabledTsetseRules.indexOf(rule.ruleName) === -1) {
      rule.register(checker);
    }
  }
}

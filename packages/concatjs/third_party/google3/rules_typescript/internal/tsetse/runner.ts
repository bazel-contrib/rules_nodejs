/**
 * @fileoverview Runner is the entry point of running Tsetse checks in compiler.
 */

import * as ts from 'typescript';

import * as perfTrace from '../tsc_wrapped/perf_trace';
import * as pluginApi from '../tsc_wrapped/plugin_api';

import {Checker} from './checker';
import {AbstractRule} from './rule';
import {Rule as CheckReturnValueRule} from './rules/check_return_value_rule';

/**
 * The Tsetse check plugin performs compile-time static analysis for TypeScript
 * code.
 */
export const PLUGIN: pluginApi.Plugin = {
  wrap: (program: ts.Program, disabledTsetseRules: string[] = []):
            ts.Program => {
    const enabledRules: AbstractRule[] = [
      new CheckReturnValueRule(),
    ];
    const checker = new Checker(program);
    for (const rule of enabledRules) {
      if (disabledTsetseRules.indexOf(rule.ruleName) === -1) {
        rule.register(checker);
      }
    }

    const proxy = pluginApi.createProxy(program);
    proxy.getSemanticDiagnostics = (sourceFile: ts.SourceFile) => {
      const result = program.getSemanticDiagnostics(sourceFile);
      perfTrace.wrap('checkConformance', () => {
        result.push(...checker.execute(sourceFile)
                        .map(failure => failure.toDiagnostic()));
      });
      return result;
    };
    return proxy;
  }
};

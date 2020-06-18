/**
 * @license
 * Copyright 2017 The Bazel Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview
 * Provides APIs for extending TypeScript command-line compiler.
 * It's roughly analogous to how the Language Service allows plugins.
 */

import * as ts from 'typescript';

export interface PluginCompilerHost extends ts.CompilerHost {
  /**
   * Absolute file paths which should be included in the initial ts.Program.
   * In vanilla tsc, these are the ts.ParsedCommandLine#fileNames
   */
  inputFiles: ReadonlyArray<string>;
}

/**
 * This API is simpler than LanguageService plugins.
 * It's used for plugins that only target the command-line and never run in an
 * editor context.
 *
 * One instance of the TscPlugin will be created for each execution of the compiler, so it is
 * safe for these plugins to hold state that's local to one execution.
 *
 * The methods on the plugin will be called in the order shown below:
 * - wrapHost to intercept CompilerHost methods and contribute inputFiles to the program
 * - setupCompilation to capture the ts.Program
 * - createTransformers once it's time to emit
 */
export interface EmitPlugin {
  /**
   * Allow plugins to add additional files to the program.
   * For example, Angular creates ngsummary and ngfactory files.
   * These files must be in the program since there may be incoming references to the symbols.
   * @param inputFiles the files that were part of the original program
   * @param compilerHost: the original host (likely a ts.CompilerHost) that we can delegate to
   */
  wrapHost?(compilerHost: ts.CompilerHost, inputFiles: string[], options: ts.CompilerOptions): PluginCompilerHost;

  setupCompilation(program: ts.Program, oldProgram?: ts.Program): {
    ignoreForDiagnostics: Set<ts.SourceFile>,
    ignoreForEmit: Set<ts.SourceFile>
  };

  getNextProgram?(): ts.Program;

  /**
   * Allow plugins to contribute additional TypeScript CustomTransformers.
   * These can modify the TS AST, JS AST, or .d.ts output AST.
   */
  createTransformers(): ts.CustomTransformers;
}

/**
 * The proxy design pattern, allowing us to customize behavior of the delegate
 * object.
 * This creates a property-by-property copy of the object, so it can be mutated
 * without affecting other users of the original object.
 * See https://en.wikipedia.org/wiki/Proxy_pattern
 */
export function createProxy<T>(delegate: T): T {
  const proxy = Object.create(null);
  for (const k of Object.keys(delegate)) {
    proxy[k] = function() {
      return (delegate as any)[k].apply(delegate, arguments);
    };
  }
  return proxy;
}

/**
 * A plugin that contributes additional diagnostics during compilation.
 *
 * This is a more limited API than Plugin, which can overwrite any features of
 * the Program. A DiagnosticPlugin can't affect the output, and can only reject
 * otherwise valid programs.
 *
 * This means that disabling a DiagnosticPlugin is always safe. It will not
 * break any downstream projects, either at build time or in production.
 *
 * It also lets us instrument the plugin to track performance, and tag the
 * diagnostics it emits with the plugin name.
 */
export interface DiagnosticPlugin {
  /**
   * A brief descriptive name for the plugin.
   *
   * Should not include 'ts', 'typescript', or 'plugin'.
   */
  readonly name: string;

  /**
   * Return diagnostics for the given file.
   *
   * Should only include new diagnostics that your plugin is contributing.
   * Should not include diagnostics from program.
   */
  getDiagnostics(sourceFile: ts.SourceFile):
      ReadonlyArray<Readonly<ts.Diagnostic>>;
}

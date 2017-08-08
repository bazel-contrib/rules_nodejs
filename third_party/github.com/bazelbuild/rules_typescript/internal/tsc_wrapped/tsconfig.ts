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

import * as path from 'path';  // from //third_party/javascript/typings/node
import * as ts from 'typescript';

/**
 * The configuration block provided by the tsconfig "bazelOptions".
 * Note that all paths here are relative to the rootDir, not absolute nor
 * relative to the location containing the tsconfig file.
 */
export interface BazelOptions {
  /** The full bazel target that is being built, e.g. //my/pkg:library. */
  target: string;

  /** If true, convert require()s into goog.module(). */
  googmodule: boolean;

  /** If true, emit ES5 into filename.es5.js. */
  es5Mode: boolean;

  /** If true, downlevel compatible decorators into annotations. */
  downlevelDecorators: boolean;

  /** If true, convert TypeScript code into a Closure-compatible variant. */
  tsickle: boolean;

  /** If true, generate externs from declarations in d.ts files. */
  tsickleGenerateExterns: boolean;

  /** Write generated externs to the given path. */
  tsickleExternsPath: string;

  /** Paths of declarations whose types must not appear in result .d.ts. */
  typeBlackListPaths: string[];

  /** If true, emit Closure types in TypeScript->JS output. */
  untyped: boolean;

  /** The list of sources we're interested in (emitting and type checking). */
  compilationTargetSrc: string[];

  /** Path to write the module dependency manifest to. */
  manifest: string;

  /**
   * Whether to disable strict deps check. If true the next parameter is
   * ignored.
   */
  disableStrictDeps?: boolean;

  /**
   * Paths of dependencies that are allowed by strict deps, i.e. that may be
   * imported by the source files in compilationTargetSrc.
   */
  allowedStrictDeps: string[];

  /** Write a performance trace to this path. Disabled when falsy. */
  perfTracePath?: string;

  /** If true, enable the conformance check plugin in TSC. */
  enableConformance: boolean;

  /**
   * An additional prelude to insert after the `goog.module` call,
   * e.g. with additional imports or requires.
   */
  prelude: string;

  /**
   * Name of the current locale if processing a locale-specific file.
   */
  locale?: string;

  /**
   * A list of errors this compilation is expected to generate, in the form
   * "TS1234:regexp". If empty, compilation is expected to succeed.
   */
  expectedDiagnostics: string[];

  /**
   * To support node_module resolution, allow TypeScript to make arbitrary
   * file system access to paths under this prefix.
   */
  nodeModulesPrefix: string;
}

export interface ParsedTsConfig {
  options: ts.CompilerOptions;
  bazelOpts: BazelOptions;
  files: string[];
  config: {};
}

/**
 * Load a tsconfig.json and convert all referenced paths (including
 * bazelOptions) to absolute paths.
 * Paths seen by TypeScript should be absolute, to match behavior
 * of the tsc ModuleResolution implementation.
 * @param tsconfigFile path to tsconfig, relative to process.cwd() or absolute
 * @return configuration parsed from the file, or error diagnostics
 */
export function parseTsconfig(
    tsconfigFile: string, host: ts.ParseConfigHost = ts.sys):
    [ParsedTsConfig, ts.Diagnostic[], {target: string}] {
  // TypeScript expects an absolute path for the tsconfig.json file
  tsconfigFile = path.resolve(tsconfigFile);

  const {config, error} = ts.readConfigFile(tsconfigFile, host.readFile);
  if (error) {
    // target is in the config file we failed to load...
    return [null, [error], {target: ''}];
  }

  const bazelOpts: BazelOptions = config.bazelOptions;
  const target = bazelOpts.target;
  const {options, errors, fileNames} = ts.parseJsonConfigFileContent(
    config, host, path.dirname(tsconfigFile));
  if (errors && errors.length) {
    return [null, errors, {target}];
  }

  // TypeScript's parseJsonConfigFileContent returns paths that are joined, eg.
  // /path/to/project/bazel-out/arch/bin/path/to/package/../../../../../../path
  // We normalize them to remove the intermediate parent directories.
  // This improves error messages and also matches logic in tsc_wrapped where we
  // expect normalized paths.
  const files = fileNames.map(f => path.normalize(f));

  // The bazelOpts paths in the tsconfig are relative to
  // options.rootDir (the google3 root) and aren't transformed by
  // parseJsonConfigFileContent (because TypeScript doesn't know
  // about them). Transform them to also be absolute here.
  bazelOpts.compilationTargetSrc =
      bazelOpts.compilationTargetSrc.map(f => path.resolve(options.rootDir, f));
  bazelOpts.allowedStrictDeps =
      bazelOpts.allowedStrictDeps.map(f => path.resolve(options.rootDir, f));
  bazelOpts.typeBlackListPaths =
      bazelOpts.typeBlackListPaths.map(f => path.resolve(options.rootDir, f));

  return [{options, bazelOpts, files, config}, null, {target}];
}

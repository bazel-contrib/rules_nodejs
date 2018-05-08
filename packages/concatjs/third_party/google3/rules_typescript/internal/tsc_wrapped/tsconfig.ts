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

import * as path from 'path';
import * as ts from 'typescript';

/**
 * The configuration block provided by the tsconfig "bazelOptions".
 * Note that all paths here are relative to the rootDir, not absolute nor
 * relative to the location containing the tsconfig file.
 */
export interface BazelOptions {
  /** Name of the bazel workspace where we are building. */
  workspaceName: string;

  /** The full bazel target that is being built, e.g. //my/pkg:library. */
  target: string;

  /** The bazel package, eg my/pkg */
  package: string;

  /** If true, convert require()s into goog.module(). */
  googmodule: boolean;

  /** If true, emit ES5 into filename.es5.js. */
  es5Mode: boolean;

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

  /**
   * List of regexes on file paths for which we suppress tsickle's warnings.
   */
  ignoreWarningPaths: string[];

  /**
   * Whether to add aliases to the .d.ts files to add the exports to the
   * ಠ_ಠ.clutz namespace.
   */
  addDtsClutzAliases: true;

  /**
   * Whether to type check inputs that aren't srcs.  Differs from
   * --skipLibCheck, which skips all .d.ts files, even those which are
   * srcs.
   */
  typeCheckDependencies: boolean;

  /**
   * The maximum cache size for bazel outputs, in megabytes.
   */
  maxCacheSizeMb?: number;

  /**
   * Suppress warnings about tsconfig.json properties that are overridden.
   */
  suppressTsconfigOverrideWarnings: boolean;

  /**
   * An explicit name for this module, given by the module_name attribute on a
   * ts_library.
   */
  moduleName?: string;

  /**
   * An explicit entry point for this module, given by the module_root attribute
   * on a ts_library.
   */
  moduleRoot?: string;

  /**
   * If true, indicates that this job is transpiling JS sources. If true, only
   * one file can appear in compilationTargetSrc, and transpiledJsOutputFileName
   * must be set.
   */
  isJsTranspilation?: boolean;

  /**
   * The path where the file containing the JS transpiled output should
   * be written. Ignored if isJsTranspilation is false.
   */
  transpiledJsOutputFileName?: string;
}

export interface ParsedTsConfig {
  options: ts.CompilerOptions;
  bazelOpts: BazelOptions;
  files: string[];
  disabledTsetseRules: string[];
  config: {};
}

// TODO(calebegg): Upstream?
interface PluginImportWithConfig extends ts.PluginImport {
  [optionName: string]: string|{};
}

/**
 * Prints messages to stderr if the given config object contains certain known
 * properties that Bazel will override in the generated tsconfig.json.
 * Note that this is not an exhaustive list of such properties; just the ones
 * thought to commonly cause problems.
 * Note that we can't error out, because users might have a legitimate reason:
 * - during a transition to Bazel they can use the same tsconfig with other
 *   tools
 * - if they have multiple packages in their repo, they might need to use path
 *   mapping so the editor knows where to resolve some absolute imports
 *
 * @param userConfig the parsed json for the full tsconfig.json file
 */
function warnOnOverriddenOptions(userConfig: any) {
  const overrideWarnings: string[] = [];
  if (userConfig.files) {
    overrideWarnings.push(
        'files is ignored because it is controlled by the srcs[] attribute');
  }
  const options: ts.CompilerOptions = userConfig.compilerOptions;
  if (options) {
    if (options.target || options.module) {
      overrideWarnings.push(
          'compilerOptions.target and compilerOptions.module are controlled by downstream dependencies, such as ts_devserver');
    }
    if (options.declaration) {
      overrideWarnings.push(
          `compilerOptions.declaration is always true, as it's needed for dependent libraries to type-check`);
    }
    if (options.paths) {
      overrideWarnings.push(
          'compilerOptions.paths is determined by the module_name attribute in transitive deps[]');
    }
    if (options.typeRoots) {
      overrideWarnings.push(
          'compilerOptions.typeRoots is always set to the @types subdirectory of the node_modules attribute');
    }
    if (options.traceResolution || (options as any).diagnostics) {
      overrideWarnings.push(
          'compilerOptions.traceResolution and compilerOptions.diagnostics are set by the DEBUG flag in tsconfig.bzl under rules_typescript');
    }
    if (options.rootDirs) {
      overrideWarnings.push(
          'compilerOptions.rootDirs is always set to the workspace, bazel-bin, and bazel-genfiles');
    }
    if (options.rootDir || options.baseUrl) {
      overrideWarnings.push(
          'compilerOptions.rootDir and compilerOptions.baseUrl are always the workspace root directory');
    }
    if (options.preserveConstEnums) {
      overrideWarnings.push(
          'compilerOptions.preserveConstEnums is always false under Bazel');
    }
    if (options.noEmitOnError) {
      // TODO(alexeagle): why??
      overrideWarnings.push(
          'compilerOptions.noEmitOnError is always false under Bazel');
    }
  }
  if (overrideWarnings.length) {
    console.error(
        '\nWARNING: your tsconfig.json file specifies options which are overridden by Bazel:');
    for (const w of overrideWarnings) console.error(` - ${w}`);
    console.error('\n');
  }
}

/**
 * The same as Node's path.resolve, however it returns a path with forward
 * slashes rather than joining the resolved path with the platform's path
 * separator.
 * Note that even path.posix.resolve('.') returns C:\Users\... with backslashes.
 */
export function resolveNormalizedPath(...segments: string[]): string {
  return path.resolve(...segments).replace(/\\/g, '/');
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
    [ParsedTsConfig|null, ts.Diagnostic[]|null, {target: string}] {
  // TypeScript expects an absolute path for the tsconfig.json file
  tsconfigFile = resolveNormalizedPath(tsconfigFile);

  const {config, error} = ts.readConfigFile(tsconfigFile, host.readFile);
  if (error) {
    // target is in the config file we failed to load...
    return [null, [error], {target: ''}];
  }

  // Handle bazel specific options, but make sure not to crash when reading a
  // vanilla tsconfig.json.
  const bazelOpts: BazelOptions = config.bazelOptions || {};
  const target = bazelOpts.target;
  bazelOpts.allowedStrictDeps = bazelOpts.allowedStrictDeps || [];
  bazelOpts.typeBlackListPaths = bazelOpts.typeBlackListPaths || [];
  bazelOpts.compilationTargetSrc = bazelOpts.compilationTargetSrc || [];

  // Allow Bazel users to control some of the bazel options.
  // Since TypeScript's "extends" mechanism applies only to "compilerOptions"
  // we have to repeat some of their logic to get the user's bazelOptions.
  if (config.extends) {
    let userConfigFile =
        resolveNormalizedPath(path.dirname(tsconfigFile), config.extends);
    if (!userConfigFile.endsWith('.json')) userConfigFile += '.json';
    const {config: userConfig, error} =
        ts.readConfigFile(userConfigFile, host.readFile);
    if (error) {
      return [null, [error], {target}];
    }
    if (userConfig.bazelOptions) {
      bazelOpts.disableStrictDeps = bazelOpts.disableStrictDeps ||
          userConfig.bazelOptions.disableStrictDeps;
      bazelOpts.suppressTsconfigOverrideWarnings =
          bazelOpts.suppressTsconfigOverrideWarnings ||
          userConfig.bazelOptions.suppressTsconfigOverrideWarnings;
    }
    if (!bazelOpts.suppressTsconfigOverrideWarnings) {
      warnOnOverriddenOptions(userConfig);
    }
  }

  const {options, errors, fileNames} =
      ts.parseJsonConfigFileContent(config, host, path.dirname(tsconfigFile));
  if (errors && errors.length) {
    return [null, errors, {target}];
  }

  // Sort rootDirs with longest include directories first.
  // When canonicalizing paths, we always want to strip
  // `workspace/bazel-bin/file` to just `file`, not to `bazel-bin/file`.
  if (options.rootDirs) options.rootDirs.sort((a, b) => b.length - a.length);

  // TypeScript's parseJsonConfigFileContent returns paths that are joined, eg.
  // /path/to/project/bazel-out/arch/bin/path/to/package/../../../../../../path
  // We normalize them to remove the intermediate parent directories.
  // This improves error messages and also matches logic in tsc_wrapped where we
  // expect normalized paths.
  const files = fileNames.map(f => path.posix.normalize(f));

  // The bazelOpts paths in the tsconfig are relative to
  // options.rootDir (the workspace root) and aren't transformed by
  // parseJsonConfigFileContent (because TypeScript doesn't know
  // about them). Transform them to also be absolute here.
  bazelOpts.compilationTargetSrc = bazelOpts.compilationTargetSrc.map(
      f => resolveNormalizedPath(options.rootDir!, f));
  bazelOpts.allowedStrictDeps = bazelOpts.allowedStrictDeps.map(
      f => resolveNormalizedPath(options.rootDir!, f));
  bazelOpts.typeBlackListPaths = bazelOpts.typeBlackListPaths.map(
      f => resolveNormalizedPath(options.rootDir!, f));
  if (bazelOpts.nodeModulesPrefix) {
    bazelOpts.nodeModulesPrefix =
        resolveNormalizedPath(options.rootDir!, bazelOpts.nodeModulesPrefix);
  }

  let disabledTsetseRules: string[] = [];
  for (const pluginConfig of options['plugins'] as PluginImportWithConfig[] ||
       []) {
    if (pluginConfig.name && pluginConfig.name === '@bazel/tsetse') {
      const disabledRules = pluginConfig['disabledRules'];
      if (disabledRules && !Array.isArray(disabledRules)) {
        throw new Error('Disabled tsetse rules must be an array of rule names');
      }
      disabledTsetseRules = disabledRules as string[];
      break;
    }
  }

  return [
    {options, bazelOpts, files, config, disabledTsetseRules}, null, {target}
  ];
}

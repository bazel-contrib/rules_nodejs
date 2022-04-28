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

  /**
   * DEPRECATED. being replaced by devmode.
   * If true, emit devmode output into filename.js.
   * If false, emit prodmode output into filename.mjs.
   */
  es5Mode: boolean;

  /**
   * If true, emit devmode output into filename.js.
   * If false, emit prodmode output into filename.mjs.
   */
  devmode: boolean;

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
   * Currently unused, remains here for backwards compat for users who set it.
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
   * one file can appear in compilationTargetSrc, and either
   * transpiledJsOutputFileName or the transpiledJs*Directory options must be
   * set.
   */
  isJsTranspilation?: boolean;

  /**
   * The path where the file containing the JS transpiled output should be
   * written. Ignored if isJsTranspilation is false. transpiledJsOutputFileName
   *
   */
  transpiledJsOutputFileName?: string;

  /**
   * The path where transpiled JS output should be written. Ignored if
   * isJsTranspilation is false. Must not be set together with
   * transpiledJsOutputFileName.
   */
  transpiledJsInputDirectory?: string;

  /**
   * The path where transpiled JS output should be written. Ignored if
   * isJsTranspilation is false. Must not be set together with
   * transpiledJsOutputFileName.
   */
  transpiledJsOutputDirectory?: string;

  /**
   * Whether the user provided an implementation shim for .d.ts files in the
   * compilation unit.
   */
  hasImplementation?: boolean;

  /**
   * If present, run the Angular ngtsc plugin with the given options.
   */
  angularCompilerOptions?: {
      [k: string]: any,
      assets: string[],
      // Ideally we would
      // import {AngularCompilerOptions} from '@angular/compiler-cli';
      // and the type would be AngularCompilerOptions&{assets: string[]};
      // but we don't want a dependency from @bazel/typescript to @angular/compiler-cli
      // as it's conceptually cyclical.
  };

  /**
   * Override for ECMAScript target language level to use for devmode.
   *
   * This setting can be set in a user's tsconfig to override the default
   * devmode target.
   *
   * EXPERIMENTAL: This setting is experimental and may be removed in the
   * future.
   */
  devmodeTargetOverride?: string;

  /**
   * Whether to type check.  Differs from typeCheckDependencies in that this
   * avoids type checking the srcs in addition to the dependencies.
   */
  typeCheck: boolean;
}

export interface ParsedTsConfig {
  options: ts.CompilerOptions;
  bazelOpts: BazelOptions;
  angularCompilerOptions?: {[k: string]: unknown};
  files: string[];
  disabledTsetseRules: string[];
  config: {};
}

// TODO(calebegg): Upstream?
interface PluginImportWithConfig extends ts.PluginImport {
  [optionName: string]: string|{};
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

  const isUndefined = (value: any): value is undefined => value === undefined;

  // Handle bazel specific options, but make sure not to crash when reading a
  // vanilla tsconfig.json.

  const readExtendedConfigFile =
    (configFile: string, existingConfig?: any): {config?: any, error?: ts.Diagnostic} => {
      const {config, error} = ts.readConfigFile(configFile, host.readFile);

      if (error) {
        return {error};
      }

      // Allow Bazel users to control some of the bazel options.
      // Since TypeScript's "extends" mechanism applies only to "compilerOptions"
      // we have to repeat some of their logic to get the user's bazelOptions.
      const mergedConfig = existingConfig || config;

      if (existingConfig) {
        const existingBazelOpts: BazelOptions = existingConfig.bazelOptions || {};
        const newBazelBazelOpts: BazelOptions = config.bazelOptions || {};

        mergedConfig.bazelOptions = {
          ...existingBazelOpts,

          disableStrictDeps: isUndefined(existingBazelOpts.disableStrictDeps)
            ? newBazelBazelOpts.disableStrictDeps
            : existingBazelOpts.disableStrictDeps,

          suppressTsconfigOverrideWarnings: isUndefined(existingBazelOpts.suppressTsconfigOverrideWarnings)
            ? newBazelBazelOpts.suppressTsconfigOverrideWarnings
            : existingBazelOpts.suppressTsconfigOverrideWarnings,

          tsickle: isUndefined(existingBazelOpts.tsickle)
            ? newBazelBazelOpts.tsickle
            : existingBazelOpts.tsickle,

          googmodule: isUndefined(existingBazelOpts.googmodule)
            ? newBazelBazelOpts.googmodule
            : existingBazelOpts.googmodule,

          devmodeTargetOverride: isUndefined(existingBazelOpts.devmodeTargetOverride)
            ? newBazelBazelOpts.devmodeTargetOverride
            : existingBazelOpts.devmodeTargetOverride,
        }
      }

      if (config.extends) {
        let extendedConfigPath = resolveNormalizedPath(path.dirname(configFile), config.extends);
        if (!extendedConfigPath.endsWith('.json')) extendedConfigPath += '.json';

        return readExtendedConfigFile(extendedConfigPath, mergedConfig);
      }

      return {config: mergedConfig};
    };

  const {config, error} = readExtendedConfigFile(tsconfigFile);
  if (error) {
    // target is in the config file we failed to load...
    return [null, [error], {target: ''}];
  }

  const {options, errors, fileNames} =
    ts.parseJsonConfigFileContent(config, host, path.dirname(tsconfigFile));

  // Handle bazel specific options, but make sure not to crash when reading a
  // vanilla tsconfig.json.
  const bazelOpts: BazelOptions = config.bazelOptions || {};
  const target = bazelOpts.target;
  bazelOpts.allowedStrictDeps = bazelOpts.allowedStrictDeps || [];
  bazelOpts.typeBlackListPaths = bazelOpts.typeBlackListPaths || [];
  bazelOpts.compilationTargetSrc = bazelOpts.compilationTargetSrc || [];


  if (errors && errors.length) {
    return [null, errors, {target}];
  }

  // Override the devmode target if devmodeTargetOverride is set
  if (bazelOpts.es5Mode && bazelOpts.devmodeTargetOverride) {
    switch (bazelOpts.devmodeTargetOverride.toLowerCase()) {
      case 'es3':
        options.target = ts.ScriptTarget.ES3;
        break;
      case 'es5':
        options.target = ts.ScriptTarget.ES5;
        break;
      case 'es2015':
        options.target = ts.ScriptTarget.ES2015;
        break;
      case 'es2016':
        options.target = ts.ScriptTarget.ES2016;
        break;
      case 'es2017':
        options.target = ts.ScriptTarget.ES2017;
        break;
      case 'es2018':
        options.target = ts.ScriptTarget.ES2018;
        break;
      case 'esnext':
        options.target = ts.ScriptTarget.ESNext;
        break;
      default:
        console.error(
            'WARNING: your tsconfig.json file specifies an invalid bazelOptions.devmodeTargetOverride value of: \'${bazelOpts.devmodeTargetOverride\'');
    }
  }

  // Sort rootDirs with longest include directories first.
  // When canonicalizing paths, we always want to strip
  // `workspace/bazel-bin/file` to just `file`, not to `bazel-bin/file`.
  if (options.rootDirs) options.rootDirs.sort((a, b) => b.length - a.length);

  // If the user requested goog.module, we need to produce that output even if
  // the generated tsconfig indicates otherwise.
  if (bazelOpts.googmodule) options.module = ts.ModuleKind.CommonJS;

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
  if (bazelOpts.angularCompilerOptions && bazelOpts.angularCompilerOptions.assets) {
    bazelOpts.angularCompilerOptions.assets = bazelOpts.angularCompilerOptions.assets.map(
      f => resolveNormalizedPath(options.rootDir!, f));
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

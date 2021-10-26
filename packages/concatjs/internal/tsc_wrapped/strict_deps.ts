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

import * as perfTrace from './perf_trace';
import * as pluginApi from './plugin_api';

export interface StrictDepsPluginConfig {
  compilationTargetSrc: string[];
  allowedStrictDeps: string[];
  rootDir: string;
}

/** The TypeScript diagnostic code for "Cannot find module ...". */
export const TS_ERR_CANNOT_FIND_MODULE = 2307;

/**
 * The strict_deps plugin checks the imports of the compiled modules.
 *
 * It implements strict deps, i.e. enforces that each file in
 * `config.compilationTargetSrc` only imports from files in
 * `config.allowedStrictDeps`.
 *
 * This is used to implement strict dependency checking -
 * source files in a build target may only import sources of their immediate
 * dependencies, but not sources of their transitive dependencies.
 *
 * strict_deps also makes sure that no imports ends in '.ts'. TypeScript
 * allows imports including the file extension, but our runtime loading support
 * fails with it.
 *
 * strict_deps currently does not check ambient/global definitions.
 */
export class Plugin implements pluginApi.DiagnosticPlugin {
  constructor(
      private readonly program: ts.Program,
      private readonly config: StrictDepsPluginConfig) {}

  readonly name = 'strictDeps';

  getDiagnostics(sourceFile: ts.SourceFile) {
    return checkModuleDeps(
        sourceFile, this.program.getTypeChecker(),
        this.config.allowedStrictDeps, this.config.rootDir);
  }
}

// Exported for testing
export function checkModuleDeps(
    sf: ts.SourceFile, tc: ts.TypeChecker, allowedDeps: string[],
    rootDir: string): ts.Diagnostic[] {
  function stripExt(fn: string) {
    return fn.replace(/(\.d)?\.tsx?$/, '');
  }
  const allowedMap: {[fileName: string]: boolean} = {};
  for (const d of allowedDeps) allowedMap[stripExt(d)] = true;

  const result: ts.Diagnostic[] = [];
  for (const stmt of sf.statements) {
    if (stmt.kind !== ts.SyntaxKind.ImportDeclaration &&
        stmt.kind !== ts.SyntaxKind.ExportDeclaration) {
      continue;
    }
    const id = stmt as ts.ImportDeclaration | ts.ExportDeclaration;
    const modSpec = id.moduleSpecifier;
    if (!modSpec) continue;  // E.g. a bare "export {x};"

    const sym = tc.getSymbolAtLocation(modSpec);
    if (!sym || !sym.declarations || sym.declarations.length < 1) {
      continue;
    }
    const declFileNames =
        sym.declarations.map(decl => decl.getSourceFile().fileName);
    if (declFileNames.find(
            declFileName => !!allowedMap[stripExt(declFileName)])) {
      continue;
    }
    const importNames = declFileNames.map(
        declFileName => path.posix.relative(rootDir, declFileName));

    const extraDeclarationLocationsMessage = (importNames.length < 2) ?
        '' :
        `(It is also declared in ${importNames.slice(1).join(', ')}) `;
    result.push({
      file: sf,
      start: modSpec.getStart(),
      length: modSpec.getEnd() - modSpec.getStart(),
      messageText: `transitive dependency on ${importNames[0]} not allowed. ` +
          extraDeclarationLocationsMessage +
          `Please add the BUILD target to your rule's deps.`,
      category: ts.DiagnosticCategory.Error,
      // semantics are close enough, needs taze.
      code: TS_ERR_CANNOT_FIND_MODULE,
    });
  }
  return result;
}

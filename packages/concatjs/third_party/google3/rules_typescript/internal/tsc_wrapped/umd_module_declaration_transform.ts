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

import * as ts from 'typescript';

/**
 * @fileoverview
 * Workaround for https://github.com/Microsoft/TypeScript/issues/18454
 * It's fixed at HEAD, so this is needed only until TypeScript 2.6.
 */

/**
 * This transformer finds AMD module definitions of the form
 * define(["require", "exports"], factory);
 * and inserts the moduleName as a first argument:
 * define("moduleName", ["require", "exports"], factory);
 */
export function fixUmdModuleDeclarations(
    moduleNamer: (sf: ts.SourceFile) =>
        string | undefined): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) =>
             (sf: ts.SourceFile): ts.SourceFile => {
               const moduleName = moduleNamer(sf);
               if (!moduleName) return sf;

               const visitor = (node: ts.Node): ts.Node => {
                 if (node.kind === ts.SyntaxKind.CallExpression) {
                   const ce = node as ts.CallExpression;
                   if (ce.expression.kind === ts.SyntaxKind.Identifier &&
                       (ce.expression as ts.Identifier).text === 'define' &&
                       ce.arguments.length === 2 &&
                       ce.arguments[1].kind === ts.SyntaxKind.Identifier &&
                       (ce.arguments[1] as ts.Identifier).text === 'factory') {
                     const newArguments =
                         [ts.createLiteral(moduleName), ...ce.arguments];
                     return ts.updateCall(
                         ce, ce.expression, ce.typeArguments, newArguments);
                   }
                 }
                 return ts.visitEachChild(node, visitor, context);
               };
               return visitor(sf) as ts.SourceFile;
             };
}
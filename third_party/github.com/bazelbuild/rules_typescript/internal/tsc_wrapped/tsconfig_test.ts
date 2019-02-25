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

import {parseTsconfig, resolveNormalizedPath} from './tsconfig';

describe('tsconfig', () => {
  it('honors bazelOptions in the users tsconfig', () => {
    const userTsconfig = {
      bazelOptions: {disableStrictDeps: true},
    };
    const generatedTsconfig = {
      extends: './user.tsconfig',
      files: ['a.ts'],
      bazelOptions: {},
    };
    const files = {
      [resolveNormalizedPath('path/to/user.tsconfig.json')]:
          '/*some comment*/\n' + JSON.stringify(userTsconfig),
      [resolveNormalizedPath('path/to/generated.tsconfig.json')]:
          JSON.stringify(generatedTsconfig),
    };
    const host: ts.ParseConfigHost = {
      useCaseSensitiveFileNames: true,
      fileExists: (path: string) => !!files[path],
      readFile: (path: string) => files[path],
      readDirectory(
          rootDir: string, extensions: ReadonlyArray<string>,
          excludes: ReadonlyArray<string>, includes: ReadonlyArray<string>,
          depth: number): string[] {
        throw new Error(`unexpected readDirectory of ${rootDir}`);
      },
    };

    const [parsed, diagnostics, {target}] =
        parseTsconfig('path/to/generated.tsconfig.json', host);
    expect(diagnostics).toBeNull();
    if (!parsed) {
      fail('Expected parsed');
    } else {
      const {options, bazelOpts, files, config} = parsed;
      expect(bazelOpts.disableStrictDeps).toBeTruthy();
    }
  });

  it('honors bazelOptions in recursive extends', ()=> {
    const tsconfigOne = {
      extends: './tsconfig-level-b.json',
      files: ['a.ts'],
      bazelOptions: {
        disableStrictDeps: false
      }
    };

    const tsconfigTwo = {
      extends: './tsconfig-level-c.json',
      bazelOptions: {
        suppressTsconfigOverrideWarnings: true
      }
    };

    const tsconfigThree = {
      bazelOptions: {
        tsickle: true,
        suppressTsconfigOverrideWarnings: false,
        disableStrictDeps: true
      }
    };
  
    const files = {
      [resolveNormalizedPath('path/to/tsconfig-level-a.json')]: JSON.stringify(tsconfigOne),
      [resolveNormalizedPath('path/to/tsconfig-level-b.json')]: JSON.stringify(tsconfigTwo),
      [resolveNormalizedPath('path/to/tsconfig-level-c.json')]: JSON.stringify(tsconfigThree),
    };

    const host: ts.ParseConfigHost = {
      useCaseSensitiveFileNames: true,
      fileExists: (path: string) => !!files[path],
      readFile: (path: string) => files[path],
      readDirectory(
          rootDir: string, extensions: ReadonlyArray<string>,
          excludes: ReadonlyArray<string>, includes: ReadonlyArray<string>,
          depth: number): string[] {
            return [];
      },
    };

    const [parsed, diagnostics] =
        parseTsconfig('path/to/tsconfig-level-a.json', host);
    expect(diagnostics).toBeNull();

    if (!parsed) {
      fail('Expected parsed');
    } else {
      const {bazelOpts} = parsed;
      expect(bazelOpts.tsickle).toBeTruthy();
      expect(bazelOpts.suppressTsconfigOverrideWarnings).toBeTruthy();
      expect(bazelOpts.disableStrictDeps).toBeFalsy();
    }
  })
});

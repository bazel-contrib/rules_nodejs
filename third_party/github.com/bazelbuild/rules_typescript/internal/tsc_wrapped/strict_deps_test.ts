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

import 'jasmine';
import * as ts from 'typescript';

import {checkModuleDeps} from './strict_deps';

describe('strict deps', () => {
  // Cache ASTs that are not part of the test to avoid parsing lib.d.ts over and
  // over again.
  const astCache = new Map<string, ts.SourceFile>();

  function createProgram(files: ts.MapLike<string>) {
    const options: ts.CompilerOptions = {
      noResolve: true,
      baseUrl: '/src',
      rootDirs: ['/src', '/src/blaze-bin'],
      paths: {'*': ['*', 'blaze-bin/*']},
    };
    // Fake compiler host relying on `files` above.
    const host = ts.createCompilerHost(options);
    const originalGetSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (fileName: string) => {
      if (!files[fileName]) {
        if (astCache.has(fileName)) return astCache.get(fileName);
        const file = originalGetSourceFile(fileName, ts.ScriptTarget.Latest);
        astCache.set(fileName, file!);
        return file;
      }
      return ts.createSourceFile(
          fileName, files[fileName], ts.ScriptTarget.Latest);
    };

    // Fake module resolution host relying on `files` above.
    host.fileExists = (f) => !!files[f];
    host.directoryExists = () => true;
    host.realpath = (f) => f;
    const rf = host.readFile.bind(host);
    host.readFile = (f) => files[f] || rf(f);
    host.getCurrentDirectory = () => '/src';
    host.getDirectories = (path) => [];

    const p = ts.createProgram(Object.keys(files), options, host);
    const diags = [...ts.getPreEmitDiagnostics(p)];
    if (diags.length > 0) {
      throw new Error(ts.formatDiagnostics(diags, {
        getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
        getNewLine: () => ts.sys.newLine,
        getCanonicalFileName: (f: string) => f,
      }));
    }
    return p;
  }

  it('reports errors for transitive dependencies', () => {
    const p = createProgram({
      '/src/p/sd1.ts': 'export let x = 1;',
      '/src/p/sd2.ts': `import {x} from "./sd1";
          export let y = x;`,
      '/src/p/sd3.ts': `import {y} from "./sd2";
          import {x} from "./sd1";
          export let z = x + y;`,
    });
    const diags = checkModuleDeps(
        p.getSourceFile('p/sd3.ts')!, p.getTypeChecker(), ['/src/p/sd2.ts'],
        '/src');
    expect(diags.length).toBe(1);
    expect(diags[0].messageText)
        .toMatch(/transitive dependency on p\/sd1.ts not allowed/);
  });

  it('reports errors for exports', () => {
    const p = createProgram({
      '/src/p/sd1.ts': 'export let x = 1;',
      '/src/p/sd2.ts': `import {x} from "./sd1";
          export let y = x;`,
      '/src/p/sd3.ts': `export {x} from "./sd1";`,
    });
    const diags = checkModuleDeps(
        p.getSourceFile('p/sd3.ts')!, p.getTypeChecker(), ['/src/p/sd2.ts'],
        '/src');
    expect(diags.length).toBe(1);
    expect(diags[0].messageText)
        .toMatch(/transitive dependency on p\/sd1.ts not allowed/);
  });

  it('supports files mapped in blaze-bin', () => {
    const p = createProgram({
      '/src/blaze-bin/p/sd1.ts': 'export let x = 1;',
      '/src/blaze-bin/p/sd2.ts': `import {x} from "./sd1";
          export let y = x;`,
      '/src/p/sd3.ts': `import {y} from "./sd2";
          import {x} from "./sd1";
          export let z = x + y;`,
    });
    const diags = checkModuleDeps(
        p.getSourceFile('/src/p/sd3.ts')!, p.getTypeChecker(),
        ['/src/blaze-bin/p/sd2.ts'], '/src');
    expect(diags.length).toBe(1);
    expect(diags[0].messageText)
        .toMatch(/dependency on blaze-bin\/p\/sd1.ts not allowed/);
  });

  it('supports .d.ts files', () => {
    const p = createProgram({
      '/src/blaze-bin/p/sd1.d.ts': 'export declare let x: number;',
      '/src/blaze-bin/p/sd2.d.ts': `import {x} from "./sd1";
          export declare let y: number;`,
      '/src/p/sd3.ts': `import {y} from "./sd2";
          import {x} from "./sd1";
          export let z = x + y;`,
    });
    const diags = checkModuleDeps(
        p.getSourceFile('/src/p/sd3.ts')!, p.getTypeChecker(),
        ['/src/blaze-bin/p/sd2.d.ts'], '/src');
    expect(diags.length).toBe(1);
    expect(diags[0].messageText)
        .toMatch(/dependency on blaze-bin\/p\/sd1.d.ts not allowed/);
  });

  it('allows multiple declarations of the same clutz-generated module', () => {
    const p = createProgram({
      '/src/blaze-bin/p/js1.d.ts': `declare module 'goog:thing' {}`,
      '/src/blaze-bin/p/js2.d.ts': `declare module 'goog:thing' {}`,
      '/src/blaze-bin/p/js3.d.ts': `declare module 'goog:thing' {}`,
      // Import from the middle one, to be sure it doesn't pass just because the
      // order so happens that we checked the declaration from the first one
      '/src/p/my.ts': `import {} from 'goog:thing'; // taze: from //p:js2`,
    });
    const good = checkModuleDeps(
        p.getSourceFile('/src/p/my.ts')!, p.getTypeChecker(),
        ['/src/blaze-bin/p/js2.d.ts'], '/src');
    expect(good.length).toBe(0);

    const bad = checkModuleDeps(
        p.getSourceFile('/src/p/my.ts')!, p.getTypeChecker(), [], '/src');
    expect(bad.length).toBe(1);
    expect(bad[0].messageText)
        .toContain(
            '(It is also declared in blaze-bin/p/js2.d.ts, blaze-bin/p/js3.d.ts)');
  });
});

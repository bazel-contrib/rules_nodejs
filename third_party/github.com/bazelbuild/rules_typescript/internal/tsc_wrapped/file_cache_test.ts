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

import {CachedFileLoader, FileCache} from './file_cache';
import {invalidateFileCache, writeTempFile} from './test_support';

function fauxDebug(...args: any[]) {
  console.error.apply(console, args);
}

describe('FileCache', () => {
  it('can be constructed', () => {
    const fileCache = new FileCache(fauxDebug);
    expect(fileCache).toBeTruthy();
  });

  it('caches files', () => {
    const fileCache = new FileCache<ts.SourceFile>(fauxDebug);
    const fileLoader = new CachedFileLoader(fileCache);
    const fn = writeTempFile('file_cache_test', 'let x: number = 12;\n');
    invalidateFileCache(fileCache, fn);

    // Caches.
    const sourceFile = fileLoader.loadFile('fileName', fn, ts.ScriptTarget.ES5);
    let sourceFile2 = fileLoader.loadFile('fileName', fn, ts.ScriptTarget.ES5);
    expect(sourceFile).toBe(sourceFile2);  // i.e., identical w/ ===

    // Invalidate the file.
    invalidateFileCache(fileCache, fn);
    sourceFile2 = fileLoader.loadFile('fileName', fn, ts.ScriptTarget.ES5);
    // New file after write/mtime change.
    expect(sourceFile).not.toBe(sourceFile2);
  });

  it('caches in LRU order', () => {
    const fileCache = new FileCache<ts.SourceFile>(fauxDebug);
    let free = false;
    fileCache.shouldFreeMemory = () => free;

    const fileLoader = new CachedFileLoader(fileCache);

    function load(name: string, fn: string) {
      return fileLoader.loadFile(name, fn, ts.ScriptTarget.ES5);
    }

    const fn1 = writeTempFile('file_cache_test1', 'let x: number = 12;\n');
    const fn2 = writeTempFile('file_cache_test2', 'let x: number = 13;\n');
    const fn3 = writeTempFile('file_cache_test3', 'let x: number = 14;\n');
    invalidateFileCache(fileCache, fn1, fn2, fn3);

    // Populate the cache.
    const f1 = load('f1', fn1);
    const f2 = load('f2', fn2);
    // Load f1 from cache again. Now f1 is the most recently used file.
    expect(load('f1', fn1)).toBe(f1);

    free = true;
    const f3 = load('f3', fn3);
    free = false;
    // f1 is still in cache, it was the MRU file.
    expect(load('f1', fn1)).toBe(f1);
    // f2 however was evicted.
    expect(load('f1', fn2)).not.toBe(f2);
  });
});

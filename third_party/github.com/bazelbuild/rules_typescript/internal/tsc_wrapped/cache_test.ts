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

import {CachedFileLoader, FileCache, ProgramAndFileCache} from './cache';
import {invalidateFileCache, writeTempFile} from './test_support';

function fauxDebug(...args: [any?, ...any[]]) {
  console.error.apply(console, args);
}

describe('Cache', () => {
  let fileCache: FileCache;
  let fileLoader: CachedFileLoader;

  function loadFile(name: string, fn: string) {
    return fileLoader.loadFile(name, fn, ts.ScriptTarget.ES5);
  }

  function setCurrentFiles(...fileName: string[]) {
    // Give all files the same digest, so that the file cache allows reading
    // them, but does not evict them.
    const digests =
        new Map(fileName.map((fn): [string, string] => [fn, 'digest']));
    fileCache.updateCache(digests);
  }

  function expectFileCacheKeys() {
    // Strip the long /tmp paths created by writeTempFile.
    return expect(
        fileCache.getFileCacheKeysForTest().map(fn => fn.replace(/.*\./, '')));
  }

  describe('FileCache', () => {
    beforeEach(() => {
      fileCache = new FileCache(fauxDebug);
      fileLoader = new CachedFileLoader(fileCache);
    });

    it('caches files', () => {
      const fn = writeTempFile('file_cache_test', 'let x: number = 12;\n');
      invalidateFileCache(fileCache, fn);

      // Caches.
      const sourceFile =
          fileLoader.loadFile('fileName', fn, ts.ScriptTarget.ES5);
      let sourceFile2 =
          fileLoader.loadFile('fileName', fn, ts.ScriptTarget.ES5);
      expect(sourceFile).toBe(sourceFile2);  // i.e., identical w/ ===

      // Invalidate the file.
      invalidateFileCache(fileCache, fn);
      sourceFile2 = fileLoader.loadFile('fileName', fn, ts.ScriptTarget.ES5);
      // New file after write/mtime change.
      expect(sourceFile).not.toBe(sourceFile2);
    });

    it('caches in LRU order', () => {
      let free = false;
      fileCache.shouldFreeMemory = () => free;

      const fn1 = writeTempFile('file_cache_test1', 'let x: number = 1;\n');
      const fn2 = writeTempFile('file_cache_test2', 'let x: number = 2;\n');
      const fn3 = writeTempFile('file_cache_test3', 'let x: number = 3;\n');
      const fn4 = writeTempFile('file_cache_test4', 'let x: number = 4;\n');
      const fn5 = writeTempFile('file_cache_test5', 'let x: number = 5;\n');
      setCurrentFiles(fn1, fn2, fn3, fn4, fn5);

      // Populate the cache.
      const f1 = loadFile('f1', fn1);
      const f2 = loadFile('f2', fn2);
      const f3 = loadFile('f3', fn3);
      const f4 = loadFile('f4', fn4);

      expectFileCacheKeys().toEqual([
        'file_cache_test1',
        'file_cache_test2',
        'file_cache_test3',
        'file_cache_test4',
      ]);

      // Load f1 from cache again. Now f1 is the most recently used file.
      expect(loadFile('f1', fn1)).toBe(f1, 'f1 should be cached');
      expectFileCacheKeys().toEqual([
        'file_cache_test2',
        'file_cache_test3',
        'file_cache_test4',
        'file_cache_test1',
      ]);

      // Now load f5 and pretend memory must be freed.
      // length / 2 == 2 files must be cleared.
      // f2 + f5 are pinned because they are part of the compilation unit.
      // f1, f3, f4 are eligible for eviction, and f1 is more recently used than
      // the others, so f1 shoud be retained, f3 + f4 dropped.

      setCurrentFiles(fn2, fn5);
      free = true;
      const f5 = loadFile('f5', fn5);
      expectFileCacheKeys().toEqual([
        'file_cache_test2',
        'file_cache_test1',
        'file_cache_test5',
      ]);
      setCurrentFiles(fn1, fn2, fn3, fn4, fn5);
      expect(loadFile('f1', fn1))
          .toBe(f1, 'f1 should not be dropped, it was recently used');
      expect(loadFile('f2', fn2)).toBe(f2, 'f2 should be pinned');
      expect(loadFile('f3', fn3)).not.toBe(f3, 'f3 should have been dropped');
      expect(loadFile('f4', fn4)).not.toBe(f4, 'f4 should have been dropped');
      expect(loadFile('f5', fn5)).toBe(f5, 'f5 should be pinned');
    });

    it('degenerates to cannotEvict mode', () => {
      // Pretend to always be out of memory.
      fileCache.shouldFreeMemory = () => true;

      const fn1 = writeTempFile('file_cache_test1', 'let x: number = 1;\n');
      const fn2 = writeTempFile('file_cache_test2', 'let x: number = 2;\n');
      const fn3 = writeTempFile('file_cache_test3', 'let x: number = 3;\n');
      const fn4 = writeTempFile('file_cache_test4', 'let x: number = 4;\n');
      setCurrentFiles(fn1, fn2, fn3);

      loadFile('fn1', fn1), loadFile('fn2', fn2);
      loadFile('fn3', fn3);

      expect(fileCache['cannotEvict']).toBe(true, 'all files are pinned');
      expectFileCacheKeys().toEqual([
        'file_cache_test1',
        'file_cache_test2',
        'file_cache_test3',
      ]);
      setCurrentFiles(fn1, fn4);
      expect(fileCache['cannotEvict']).toBe(false, 'pinned files reset');
      loadFile('fn4', fn4);
      expectFileCacheKeys().toEqual([
        'file_cache_test1',
        'file_cache_test4',
      ]);
    });
  });

  describe('ProgramAndFileCache', () => {
    let cache: ProgramAndFileCache;

    function loadProgram(name: string): ts.Program {
      const p = {} as ts.Program;
      cache.putProgram(name, p);
      return p;
    }

    function expectProgramCacheKeys() {
      return expect(cache.getProgramCacheKeysForTest());
    }

    beforeEach(() => {
      fileCache = new ProgramAndFileCache(fauxDebug);
      fileLoader = new CachedFileLoader(fileCache);
      cache = fileCache as ProgramAndFileCache;
    });

    it('caches programs', () => {
      const name = 'fauxprogram';
      const program = loadProgram(name);

      expect(cache.getProgram(name)).toBe(program);
    });

    it('caches programs in LRU order', () => {
      let free = false;
      cache.shouldFreeMemory = () => free;

      // Populate the cache.
      const p1 = loadProgram('p1');
      loadProgram('p2');
      loadProgram('p3');
      loadProgram('p4');

      expectProgramCacheKeys().toEqual([
        'p1',
        'p2',
        'p3',
        'p4',
      ]);

      // Load p1 from cache again. Now p1 is the most recently used program.
      expect(cache.getProgram('p1')).toBe(p1);
      expectProgramCacheKeys().toEqual([
        'p2',
        'p3',
        'p4',
        'p1',
      ]);

      // Now load p5 and pretend memory must be freed.
      // length / 2 == 2 files must be cleared.

      free = true;
      loadProgram('p5');
      expectProgramCacheKeys().toEqual([
        'p4',
        'p1',
        'p5',
      ]);
    });

    it('evicts programs before files', () => {
      let free = false;
      cache.shouldFreeMemory = () => free;

      // Populate the cache.
      loadProgram('p1');
      const fn1 = writeTempFile('file_cache_test1', 'let x: number = 1;\n');
      const fn2 = writeTempFile('file_cache_test2', 'let x: number = 2;\n');
      setCurrentFiles(fn1);
      loadFile('fn1', fn1);
      expectProgramCacheKeys().toEqual(['p1']);
      expectFileCacheKeys().toEqual(['file_cache_test1']);

      free = true;
      setCurrentFiles(fn2);
      loadFile('fn2', fn2);
      expectProgramCacheKeys().toEqual([]);
      expectFileCacheKeys().toEqual(['file_cache_test1', 'file_cache_test2']);
    });
  });
});

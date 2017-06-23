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

import * as fs from 'fs';
import * as ts from 'typescript';
import * as perfTrace from './perf_trace';

export interface CacheEntry<CachedType> {
  digest: string;
  value: CachedType;
}

export interface LRUCache<CachedType> {
  getCache(key: string): CachedType|undefined;
  putCache(key: string, value: CacheEntry<CachedType>): void;
  inCache(key: string): boolean;
}

// Cache at most to this amount of memory use.  It appears that
// without the cache involved, our steady state size after parsing is
// in the ~150mb range.
const MAX_CACHE_SIZE = 300 * (1 << 20 /* 1 MB */);

/**
 * FileCache is a trivial LRU cache for bazel outputs.
 *
 * Cache entries are keyed off by an opaque, bazel-supplied digest.
 *
 * This code uses the fact that JavaScript hash maps are linked lists - after
 * reaching the cache size limit, it deletes the oldest (first) entries. Used
 * cache entries are moved to the end of the list by deleting and re-inserting.
 */
export class FileCache<CachedType> implements LRUCache<CachedType> {
  private fileCache: {[filePath: string]: CacheEntry<CachedType>} = {};
  /**
   * FileCache does not know how to construct bazel's opaque digests. This
   * field caches the last compile run's digests, so that code below knows what
   * digest to assign to a newly loaded file.
   */
  private lastDigests: {[filePath: string]: string} = {};
  public cacheStats = {
    hits: 0,
    reads: 0,
    readTimeMs: 0,
  };

  constructor(private debug: (...msg: any[]) => void) {}

  /**
   * Updates the cache with the given digests.
   *
   * updateCache must be called before loading files - only files that were
   * updated (with a digest) previously can be loaded.
   */
  updateCache(digests: {[filePath: string]: string}) {
    this.debug('updating digests:', digests);
    this.lastDigests = digests;
    for (const fp of Object.keys(digests)) {
      const entry = this.fileCache[fp];
      if (entry && entry.digest !== digests[fp]) {
        this.debug(
            'dropping file cache entry for', fp, 'digests', entry.digest,
            digests[fp]);
        delete this.fileCache[fp];
      }
    }
  }

  getLastDigest(filePath: string): string {
    const digest = this.lastDigests[filePath];
    if (!digest) {
      throw new Error(
          `missing input digest for ${filePath}.` +
          `(only have ${Object.keys(this.lastDigests)})`);
    }
    return digest;
  }

  getCache(filePath: string): CachedType|undefined {
    this.cacheStats.reads++;

    const entry = this.fileCache[filePath];
    if (!entry) {
      this.debug('Cache miss:', filePath);
      return undefined;
    } else {
      this.debug('Cache hit:', filePath);
      this.cacheStats.hits++;
      // Move a used file to the end of the cache by deleting and re-inserting
      // it.
      delete this.fileCache[filePath];
      this.fileCache[filePath] = entry;
      return entry.value;
    }
  }

  putCache(filePath: string, entry: CacheEntry<CachedType>): void {
    const readStart = Date.now();
    this.cacheStats.readTimeMs += Date.now() - readStart;

    let dropped = 0;
    if (this.shouldFreeMemory()) {
      // Drop half the cache, the least recently used entry == the first
      // entry.
      this.debug('Evicting from the cache');
      const keys = Object.keys(this.fileCache);
      dropped = Math.round(keys.length / 2);
      for (let i = 0; i < dropped; i++) {
        delete this.fileCache[keys[i]];
      }
    }
    this.fileCache[filePath] = entry;
    this.debug('Loaded', filePath, 'dropped', dropped, 'cache entries');
  }

  inCache(filePath: string): boolean {
    return !!this.getCache(filePath);
  }

  resetStats() {
    this.cacheStats = {
      hits: 0,
      reads: 0,
      readTimeMs: 0,
    };
  }

  printStats() {
    const percentage =
        (this.cacheStats.hits / this.cacheStats.reads * 100).toFixed(2);
    this.debug('Cache stats:', percentage, '% hits', this.cacheStats);
  }

  traceStats() {
    // counters are rendered as stacked bar charts, so record cache
    // hits/misses rather than the 'reads' stat tracked in cacheSats
    // so the chart makes sense.
    perfTrace.counter('file cache hit rate', {
      'hits': this.cacheStats.hits,
      'misses': this.cacheStats.reads - this.cacheStats.hits,
    });
    perfTrace.counter('file cache time', {
      'read': this.cacheStats.readTimeMs,
    });
  }

  /**
   * Returns whether the cache should free some memory.
   *
   * Defined as a property so it can be overridden in tests.
   */
  shouldFreeMemory: () => boolean = () => {
    return process.memoryUsage().heapUsed > MAX_CACHE_SIZE;
  };
}

export interface FileLoader {
  loadFile(fileName: string, filePath: string, langVer: ts.ScriptTarget):
      ts.SourceFile;
}

/**
 * Load a source file from disk, or possibly return a cached version.
 */
export class CachedFileLoader implements FileLoader {
  constructor(private cache: FileCache<ts.SourceFile>) {}

  loadFile(fileName: string, filePath: string, langVer: ts.ScriptTarget):
      ts.SourceFile {
    let sourceFile = this.cache.getCache(filePath);
    if (!sourceFile) {
      const sourceText = fs.readFileSync(filePath, 'utf8');
      sourceFile = ts.createSourceFile(fileName, sourceText, langVer, true);
      const entry = {
        digest: this.cache.getLastDigest(filePath),
        value: sourceFile
      };
      this.cache.putCache(filePath, entry);
    }

    return sourceFile;
  }
}

/** Load a source file from disk. */
export class UncachedFileLoader implements FileLoader {
  loadFile(fileName: string, filePath: string, langVer: ts.ScriptTarget):
      ts.SourceFile {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    return ts.createSourceFile(fileName, sourceText, langVer, true);
  }
}

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

type Debug = (...msg: Array<{}>) => void;

interface CacheStats {
  reads: number;
  hits: number;
  evictions: number;
}

/**
 * Cache exposes a trivial LRU cache.
 *
 * This code uses the fact that JavaScript hash maps are linked lists - after
 * reaching the cache size limit, it deletes the oldest (first) entries. Used
 * cache entries are moved to the end of the list by deleting and re-inserting.
 */
class Cache<T> {
  private map = new Map<string, T>();
  private stats: CacheStats = {reads: 0, hits: 0, evictions: 0};

  constructor(private name: string, private debug: Debug) {}

  set(key: string, value: T) {
    this.map.set(key, value);
  }

  get(key: string, updateCache = true): T|undefined {
    this.stats.reads++;

    const entry = this.map.get(key);
    if (updateCache) {
      if (entry) {
        this.debug(this.name, 'cache hit:', key);
        this.stats.hits++;
        // Move an entry to the end of the cache by deleting and re-inserting
        // it.
        this.map.delete(key);
        this.map.set(key, entry);
      } else {
        this.debug(this.name, 'cache miss:', key);
      }
      this.traceStats();
    }
    return entry;
  }

  delete(key: string) {
    this.map.delete(key);
  }

  evict(unevictableKeys?: {has: (key: string) => boolean}): number {
    // Drop half the cache, the least recently used entry == the first entry.
    this.debug('Evicting from the', this.name, 'cache...');
    const originalSize = this.map.size;
    let numberKeysToDrop = originalSize / 2;
    if (numberKeysToDrop === 0) {
      return 0;
    }
    // Map keys are iterated in insertion order, since we reinsert on access
    // this is indeed a LRU strategy.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/keys
    for (const key of this.map.keys()) {
      if (numberKeysToDrop === 0) break;
      if (unevictableKeys && unevictableKeys.has(key)) continue;
      this.map.delete(key);
      numberKeysToDrop--;
    }
    const keysDropped = originalSize - this.map.size;
    this.stats.evictions += keysDropped;
    this.debug('Evicted', keysDropped, this.name, 'cache entries');
    this.traceStats();
    return keysDropped;
  }

  keys() {
    return this.map.keys();
  }

  resetStats() {
    this.stats = {hits: 0, reads: 0, evictions: 0};
  }

  printStats() {
    let percentage;
    if (this.stats.reads === 0) {
      percentage = 100.00;  // avoid "NaN %"
    } else {
      percentage = (this.stats.hits / this.stats.reads * 100).toFixed(2);
    }
    this.debug(`${this.name} cache stats: ${percentage}% hits`, this.stats);
  }

  traceStats() {
    // counters are rendered as stacked bar charts, so record cache
    // hits/misses rather than the 'reads' stat tracked in stats
    // so the chart makes sense.
    perfTrace.counter(`${this.name} cache hit rate`, {
      'hits': this.stats.hits,
      'misses': this.stats.reads - this.stats.hits,
    });
    perfTrace.counter(`${this.name} cache evictions`, {
      'evictions': this.stats.evictions,
    });
    perfTrace.counter(`${this.name} cache size`, {
      [`${this.name}s`]: this.map.size,
    });
  }
}

export interface SourceFileEntry {
  digest: string;  // blaze's opaque digest of the file
  value: ts.SourceFile;
}

/**
 * Default memory size, beyond which we evict from the cache.
 */
const DEFAULT_MAX_MEM_USAGE = 1024 * (1 << 20 /* 1 MB */);

/**
 * FileCache is a trivial LRU cache for typescript-parsed bazel-output files.
 *
 * Cache entries include an opaque bazel-supplied digest to track staleness.
 * Expected digests must be set (using updateCache) before using the cache.
 */
// TODO(martinprobst): Drop the <T> parameter, it's no longer used.
export class FileCache<T = {}> {
  private fileCache = new Cache<SourceFileEntry>('file', this.debug);
  /**
   * FileCache does not know how to construct bazel's opaque digests. This
   * field caches the last (or current) compile run's digests, so that code
   * below knows what digest to assign to a newly loaded file.
   */
  private lastDigests = new Map<string, string>();
  /**
   * FileCache can enter a degenerate state, where all cache entries are pinned
   * by lastDigests, but the system is still out of memory. In that case, do not
   * attempt to free memory until lastDigests has changed.
   */
  private cannotEvict = false;

  /**
   * Because we cannot measuse the cache memory footprint directly, we evict
   * when the process' total memory usage goes beyond this number.
   */
  private maxMemoryUsage = DEFAULT_MAX_MEM_USAGE;

  constructor(protected debug: (...msg: Array<{}>) => void) {}

  setMaxCacheSize(maxCacheSize: number) {
    if (maxCacheSize < 0) {
      throw new Error(`FileCache max size is negative: ${maxCacheSize}`);
    }
    this.debug('Cache max size is', maxCacheSize >> 20, 'MB');
    this.maxMemoryUsage = maxCacheSize;
    this.maybeFreeMemory();
  }

  resetMaxCacheSize() {
    this.setMaxCacheSize(DEFAULT_MAX_MEM_USAGE);
  }

  /**
   * Updates the cache with the given digests.
   *
   * updateCache must be called before loading files - only files that were
   * updated (with a digest) previously can be loaded.
   */
  updateCache(digests: Map<string, string>): void {
    this.debug('updating digests:', digests);
    this.lastDigests = digests;
    this.cannotEvict = false;
    for (const [filePath, newDigest] of digests.entries()) {
      const entry = this.fileCache.get(filePath, /*updateCache=*/ false);
      if (entry && entry.digest !== newDigest) {
        this.debug(
            'dropping file cache entry for', filePath, 'digests', entry.digest,
            newDigest);
        this.fileCache.delete(filePath);
      }
    }
  }

  getLastDigest(filePath: string): string {
    const digest = this.lastDigests.get(filePath);
    if (!digest) {
      const errorMsg = `missing input digest for ${filePath}. `;
      let entriesToPrint = Array.from(this.lastDigests.keys());
      if (entriesToPrint.length > 100) {
        throw new Error(
            errorMsg +
            `(only have ${entriesToPrint.slice(0, 100)} and ${
                entriesToPrint.length - 100} more)`);
      }
      throw new Error(errorMsg + `(only have ${entriesToPrint})`);
    }
    return digest;
  }

  getCache(filePath: string): ts.SourceFile|undefined {
    const entry = this.fileCache.get(filePath);
    if (entry) return entry.value;
    return undefined;
  }

  putCache(filePath: string, entry: SourceFileEntry): void {
    const dropped = this.maybeFreeMemory();
    this.fileCache.set(filePath, entry);
    this.debug('Loaded file:', filePath, 'dropped', dropped, 'files');
  }

  /**
   * Returns true if the given filePath was reported as an input up front and
   * has a known cache digest. FileCache can only cache known files.
   */
  isKnownInput(filePath: string): boolean {
    return this.lastDigests.has(filePath);
  }

  inCache(filePath: string): boolean {
    return !!this.getCache(filePath);
  }

  resetStats() {
    this.fileCache.resetStats();
  }

  printStats() {
    this.fileCache.printStats();
  }

  traceStats() {
    this.fileCache.traceStats();
  }

  /**
   * Returns whether the cache should free some memory.
   *
   * Defined as a property so it can be overridden in tests.
   */
  shouldFreeMemory: () => boolean = () => {
    return process.memoryUsage().heapUsed > this.maxMemoryUsage;
  };

  /**
   * Frees memory if required. Returns the number of dropped entries.
   */
  maybeFreeMemory() {
    if (!this.shouldFreeMemory() || this.cannotEvict) {
      return 0;
    }
    const dropped = this.fileCache.evict(this.lastDigests);
    if (dropped === 0) {
      // Freeing memory did not drop any cache entries, because all are pinned.
      // Stop evicting until the pinned list changes again. This prevents
      // degenerating into an O(n^2) situation where each file load iterates
      // through the list of all files, trying to evict cache keys in vain
      // because all are pinned.
      this.cannotEvict = true;
    }
    return dropped;
  }

  getFileCacheKeysForTest() {
    return Array.from(this.fileCache.keys());
  }
}

/**
 * ProgramAndFileCache is a trivial LRU cache for typescript-parsed programs and
 * bazel-output files.
 *
 * Programs are evicted before source files because they have less reuse across
 * compilations.
 */
export class ProgramAndFileCache extends FileCache {
  private programCache = new Cache<ts.Program>('program', this.debug);

  getProgram(target: string): ts.Program|undefined {
    return this.programCache.get(target);
  }

  putProgram(target: string, program: ts.Program): void {
    const dropped = this.maybeFreeMemory();
    this.programCache.set(target, program);
    this.debug('Loaded program:', target, 'dropped', dropped, 'entries');
  }

  resetStats() {
    super.resetStats();
    this.programCache.resetStats();
  }

  printStats() {
    super.printStats();
    this.programCache.printStats();
  }

  traceStats() {
    super.traceStats();
    this.programCache.traceStats();
  }

  maybeFreeMemory() {
    if (!this.shouldFreeMemory()) return 0;

    const dropped = this.programCache.evict();
    if (dropped > 0) return dropped;

    return super.maybeFreeMemory();
  }

  getProgramCacheKeysForTest() {
    return Array.from(this.programCache.keys());
  }
}

export interface FileLoader {
  loadFile(fileName: string, filePath: string, langVer: ts.ScriptTarget):
      ts.SourceFile;
  fileExists(filePath: string): boolean;
}

/**
 * Load a source file from disk, or possibly return a cached version.
 */
export class CachedFileLoader implements FileLoader {
  /** Total amount of time spent loading files, for the perf trace. */
  private totalReadTimeMs = 0;

  // TODO(alexeagle): remove unused param after usages updated:
  // angular:packages/bazel/src/ngc-wrapped/index.ts
  constructor(private readonly cache: FileCache, unused?: boolean) {}

  fileExists(filePath: string) {
    return this.cache.isKnownInput(filePath);
  }

  loadFile(fileName: string, filePath: string, langVer: ts.ScriptTarget):
      ts.SourceFile {
    let sourceFile = this.cache.getCache(filePath);
    if (!sourceFile) {
      const readStart = Date.now();
      const sourceText = fs.readFileSync(filePath, 'utf8');
      sourceFile = ts.createSourceFile(fileName, sourceText, langVer, true);
      const entry = {
        digest: this.cache.getLastDigest(filePath),
        value: sourceFile
      };
      const readEnd = Date.now();
      this.cache.putCache(filePath, entry);

      this.totalReadTimeMs += readEnd - readStart;
      perfTrace.counter('file load time', {
        'read': this.totalReadTimeMs,
      });
      perfTrace.snapshotMemoryUsage();
    }

    return sourceFile;
  }
}

/** Load a source file from disk. */
export class UncachedFileLoader implements FileLoader {
  fileExists(filePath: string): boolean {
    return ts.sys.fileExists(filePath);
  }

  loadFile(fileName: string, filePath: string, langVer: ts.ScriptTarget):
      ts.SourceFile {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    return ts.createSourceFile(fileName, sourceText, langVer, true);
  }
}

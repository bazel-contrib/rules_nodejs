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

/** @fileoverview Helper functions for tests. */

import * as fs from 'fs';

import {FileCache} from './cache';

export function writeTempFile(name: string, contents: string): string {
  // TEST_TMPDIR is set by bazel.
  const fn = (process.env['TEST_TMPDIR'] || '/tmp') + '/tmp.' +
      (Math.random() * 1000000).toFixed(0) + '.' + name;
  fs.writeFileSync(fn, contents);
  return fn;
}

let digestNumber = 0;

export function invalidateFileCache(fc: FileCache, ...fileNames: string[]) {
  const digests = new Map<string, string>();
  for (const fp of fileNames) {
    digestNumber++;
    digests.set(fp, `${fp}${digestNumber}`);
  }
  fc.updateCache(digests);
}

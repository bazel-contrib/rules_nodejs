/**
 * @license
 * Copyright 2019 The Bazel Authors. All rights reserved.
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
import { escapeFunction } from '../src/fs';
import * as assert from 'assert';
import * as path from 'path';

describe('escape function', () => {
  it('isOutPath is correct', () => {
    const root = '/a/b';
    const { isOutPath } = escapeFunction(root);

    assert.ok(isOutPath('/a'));
    assert.ok(isOutPath('/a/c/b'));
    assert.ok(!isOutPath('/a/b'));
    assert.ok(!isOutPath('/a/b/c/d'));
  });

  it('isEscape is correct', () => {
    const root = '/a/b';
    const { isEscape } = escapeFunction(root);

    assert.ok(isEscape('/a/c/boop', '/a/b/l'));
    assert.ok(isEscape('/a/c/boop', '/a/b'));
    assert.ok(isEscape('/a', '/a/b'));
    assert.ok(!isEscape('/a/c/boop', '/a/c'));
    assert.ok(!isEscape('/a/b/f', '/a/b/l'));
  });

  it('isEscape handles relative paths', () => {
    const root = './a/b';
    const { isEscape } = escapeFunction(root);

    assert.ok(isEscape('./a/c/boop', './a/b/l'));
    assert.ok(isEscape('./a/c/boop', './a/b'));
    assert.ok(isEscape('./a', './a/b'));
    assert.ok(!isEscape('./a/c/boop', './a/c'));
    assert.ok(!isEscape('./a/b/f', './a/b/l'));
  });
});

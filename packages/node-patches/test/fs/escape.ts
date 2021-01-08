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
import * as assert from 'assert';
import * as path from 'path';

import {escapeFunction, isOutPath} from '../../src/fs';

describe('escape function', () => {
  it('isOutPath is correct', () => {
    assert.ok(isOutPath('/a/b', '/a'));
    assert.ok(isOutPath('/a/b', '/a/c/b'));
    assert.ok(!isOutPath('/a/b', '/a/b'));
    assert.ok(!isOutPath('/a/b', '/a/b/c/d'));
  });

  it('isEscape is correct', () => {
    const roots = [
      '/a/b',
      '/a/b/g/1',
      '/a/b/g/a/2',
      '/a/b/g/a/3',
    ];
    const {isEscape} = escapeFunction(roots);

    assert.ok(isEscape('/a/c/boop', '/a/b/l'));
    assert.ok(isEscape('/a/c/boop', '/a/b'));
    assert.ok(isEscape('/a', '/a/b'));
    assert.ok(!isEscape('/a/c/boop', '/a/c'));
    assert.ok(!isEscape('/a/b/f', '/a/b/l'));

    assert.ok(isEscape('/some/path', '/a/b/g/1'));
    assert.ok(isEscape('/some/path', '/a/b/g/1/foo'));
    assert.ok(isEscape('/some/path', '/a/b/g/h'));
    assert.ok(isEscape('/some/path', '/a/b/g/h/i'));
    assert.ok(isEscape('/some/path', '/a/b/g/a/2'));
    assert.ok(isEscape('/some/path', '/a/b/g/a/2/foo'));
    assert.ok(isEscape('/some/path', '/a/b/g/a/3'));
    assert.ok(isEscape('/some/path', '/a/b/g/a/3/foo'));
    assert.ok(isEscape('/some/path', '/a/b/g/a/h'));
    assert.ok(isEscape('/some/path', '/a/b/g/a/h/i'));

    assert.ok(isEscape('/a/b', '/a/b/g/1'));
    assert.ok(isEscape('/a/b', '/a/b/g/1/foo'));
    assert.ok(!isEscape('/a/b', '/a/b/g/h'));
    assert.ok(!isEscape('/a/b', '/a/b/g/h/i'));
    assert.ok(isEscape('/a/b', '/a/b/g/a/2'));
    assert.ok(isEscape('/a/b', '/a/b/g/a/2/foo'));
    assert.ok(isEscape('/a/b', '/a/b/g/a/3'));
    assert.ok(isEscape('/a/b', '/a/b/g/a/3/foo'));
    assert.ok(!isEscape('/a/b', '/a/b/g/a/h'));
    assert.ok(!isEscape('/a/b', '/a/b/g/a/h/i'));

    assert.ok(isEscape('/a/b/c', '/a/b/g/1'));
    assert.ok(isEscape('/a/b/c', '/a/b/g/1/foo'));
    assert.ok(!isEscape('/a/b/c', '/a/b/g/h'));
    assert.ok(!isEscape('/a/b/c', '/a/b/g/h/i'));
    assert.ok(isEscape('/a/b/c', '/a/b/g/a/2'));
    assert.ok(isEscape('/a/b/c', '/a/b/g/a/2/foo'));
    assert.ok(isEscape('/a/b/c', '/a/b/g/a/3'));
    assert.ok(isEscape('/a/b/c', '/a/b/g/a/3/foo'));
    assert.ok(!isEscape('/a/b/c', '/a/b/g/a/h'));
    assert.ok(!isEscape('/a/b/c', '/a/b/g/a/h/i'));
  });

  it('isEscape handles relative paths', () => {
    const roots = [
      './a/b',
      './a/b/g/1',
      './a/b/g/a/2',
      './a/b/g/a/3',
    ];
    const {isEscape} = escapeFunction(roots);

    assert.ok(isEscape('./a/c/boop', './a/b/l'));
    assert.ok(isEscape('./a/c/boop', './a/b'));
    assert.ok(isEscape('./a', './a/b'));
    assert.ok(!isEscape('./a/c/boop', './a/c'));
    assert.ok(!isEscape('./a/b/f', './a/b/l'));

    assert.ok(isEscape('./some/path', './a/b/g/1'));
    assert.ok(isEscape('./some/path', './a/b/g/1/foo'));
    assert.ok(isEscape('./some/path', './a/b/g/h'));
    assert.ok(isEscape('./some/path', './a/b/g/h/i'));
    assert.ok(isEscape('./some/path', './a/b/g/a/2'));
    assert.ok(isEscape('./some/path', './a/b/g/a/2/foo'));
    assert.ok(isEscape('./some/path', './a/b/g/a/3'));
    assert.ok(isEscape('./some/path', './a/b/g/a/3/foo'));
    assert.ok(isEscape('./some/path', './a/b/g/a/h'));
    assert.ok(isEscape('./some/path', './a/b/g/a/h/i'));

    assert.ok(isEscape('./a/b', './a/b/g/1'));
    assert.ok(isEscape('./a/b', './a/b/g/1/foo'));
    assert.ok(!isEscape('./a/b', './a/b/g/h'));
    assert.ok(!isEscape('./a/b', './a/b/g/h/i'));
    assert.ok(isEscape('./a/b', './a/b/g/a/2'));
    assert.ok(isEscape('./a/b', './a/b/g/a/2/foo'));
    assert.ok(isEscape('./a/b', './a/b/g/a/3'));
    assert.ok(isEscape('./a/b', './a/b/g/a/3/foo'));
    assert.ok(!isEscape('./a/b', './a/b/g/a/h'));
    assert.ok(!isEscape('./a/b', './a/b/g/a/h/i'));

    assert.ok(isEscape('./a/b/c', './a/b/g/1'));
    assert.ok(isEscape('./a/b/c', './a/b/g/1/foo'));
    assert.ok(!isEscape('./a/b/c', './a/b/g/h'));
    assert.ok(!isEscape('./a/b/c', './a/b/g/h/i'));
    assert.ok(isEscape('./a/b/c', './a/b/g/a/2'));
    assert.ok(isEscape('./a/b/c', './a/b/g/a/2/foo'));
    assert.ok(isEscape('./a/b/c', './a/b/g/a/3'));
    assert.ok(isEscape('./a/b/c', './a/b/g/a/3/foo'));
    assert.ok(!isEscape('./a/b/c', './a/b/g/a/h'));
    assert.ok(!isEscape('./a/b/c', './a/b/g/a/h/i'));
  });
});

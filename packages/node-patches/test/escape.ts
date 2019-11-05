import { escapeFunction } from '../src/fs';
import * as assert from 'assert';

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
});

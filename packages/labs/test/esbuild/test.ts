import {statSync} from 'fs';

describe('esbuild', () => {
  it('for esm, should output a file', () => {
    const stats = statSync('packages/labs/test/esbuild/bundle_esm/main.js');

    expect(stats).not.toBeUndefined();
  });

  it('for iife, should output a file', () => {
    const stats = statSync('packages/labs/test/esbuild/bundle_iife/main.js');

    expect(stats).not.toBeUndefined();
  });
});

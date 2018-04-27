const {sep, join} = require('path');

TMPL_module_mappings = {
  'foo': 'path/to/foo_lib',
  'other': 'external/other_wksp/path/to/other_lib',
};

const rootDir = 'bazel-bin/path/to/a.esm5';
TMPL_additional_plugins = [];
TMPL_banner_file = '';
TMPL_stamp_data = '';

const baseDir = '/root/base';
const files = [
  '/root/base/bazel-bin/path/to/a.esm5/path/to/foo_lib/bar',
  '/root/base/bazel-bin/path/to/a.esm5/external/other_wksp/path/to/other_lib/thing',
  '/root/base/bazel-bin/path/to/a.esm5/external/some_wksp/path/to/a/public_api.js',
  '/root/base/bazel-bin/path/to/a.esm5/external/some_wksp/path/to/a/index.js',
];
const resolve =
    (p) => {
      p = p.replace(/\\/g, '/');
      if (files.includes(p)) return p;
      if (files.includes(p + '.js')) return p + '.js';
      if (files.includes(p + '/index.js')) return p + '/index.js';
      throw new Error('resolve failed');
    }

const rollupConfig = require('./rollup.config');

function doResolve(importee, importer) {
  const resolved = rollupConfig.resolveBazel(importee, importer, baseDir, resolve, rootDir);
  if (resolved) {
    return resolved.replace(/\\/g, '/');
  } else {
    fail(`did not resolve path for import ${importee} (from ${importer})`);
  }
}

describe('rollup config', () => {
  it('should resolve relative imports', () => {
    expect(doResolve(
               `.${sep}a`,
               join(
                   baseDir, 'bazel-bin', 'path', 'to', 'a.esm5', 'external', 'some_wksp', 'path',
                   'to', 'b')))
        .toEqual(`${baseDir}/bazel-bin/path/to/a.esm5/external/some_wksp/path/to/a/index.js`);
    expect(doResolve(
               `..${sep}a`,
               join(
                   baseDir, 'bazel-bin', 'path', 'to', 'a.esm5', 'external', 'some_wksp', 'path',
                   'to', 'b', 'sub')))
        .toEqual(`${baseDir}/bazel-bin/path/to/a.esm5/external/some_wksp/path/to/a/index.js`);
  });

  it('should resolve relative imports from other root', () => {
    expect(doResolve(
               `.${sep}public_api`,
               join(
                   baseDir, 'bazel-bin', 'path', 'to', 'a.esm5', 'external', 'some_wksp', 'path',
                   'to', 'a', 'index.js')))
        .toEqual(`${baseDir}/bazel-bin/path/to/a.esm5/external/some_wksp/path/to/a/public_api.js`);
  });

  it('should find paths using module mapping', () => {
    expect(doResolve(`foo${sep}bar`))
        .toEqual(`${baseDir}/bazel-bin/path/to/a.esm5/path/to/foo_lib/bar`);
    expect(doResolve(`other${sep}thing`))
        .toEqual(`${baseDir}/bazel-bin/path/to/a.esm5/external/other_wksp/path/to/other_lib/thing`);
  });

  it('should find paths in any root', () => {
    expect(doResolve('path/to/foo_lib/bar'))
        .toEqual(`${baseDir}/bazel-bin/path/to/a.esm5/path/to/foo_lib/bar`);
    expect(doResolve('external/some_wksp/path/to/a'))
        .toEqual(`${baseDir}/bazel-bin/path/to/a.esm5/external/some_wksp/path/to/a/index.js`);
  })
});

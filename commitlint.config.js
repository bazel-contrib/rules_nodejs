module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 120],
    'scope-enum': [
      2,
      'always',
      [
        'angular',
        'builtin',
        'concatjs',
        'create',
        'cypress',
        'esbuild',
        'examples',
        'jasmine',
        'labs',
        'protractor',
        'rollup',
        'runfiles',
        'terser',
        'typescript',
        'worker',
        'docs',
      ],
    ],
  },
};

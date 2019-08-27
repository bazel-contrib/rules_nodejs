module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
    'scope-enum': [
      2, 'always',
      [
        'bazel',
        'buildifier',
        'buildozer',
        'builtin',
        'create',
        'hide-bazel-files',
        'jasmine',
        'karma',
        'labs',
        'less',
        'protractor',
        'stylus',
        'rollup',
        'terser',
        'typescript',
        'worker',
      ]
    ]
  }
}

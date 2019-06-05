module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2, 'always',
      [
        'bazel',
        'buildifier',
        'buildozer',
        'builtin',
        'create',
        'jasmine',
        'karma',
        'labs',
        'rollup',
        'typescript',
      ]
    ]
  }
}

// Configure React for production
// https://github.com/bazelbuild/rules_nodejs/issues/555
window.process = {
  env: {NODE_ENV: 'production'}
}

// Configure React for development mode
// https://github.com/bazelbuild/rules_nodejs/issues/555
window.process = {
  env: {NODE_ENV: 'development'}
}

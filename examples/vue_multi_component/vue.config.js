// vue.config.js
css: { extract: false }
module.exports = {
  configureWebpack: {
    resolve: {
      modules: [
        "bazel-out/k8-fastbuild/bin",
      ]
    }
  }
}

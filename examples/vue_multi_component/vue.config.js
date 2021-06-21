// vue.config.js
module.exports = {
  configureWebpack: {
    resolve: {
      modules: [
        "bazel-out/k8-fastbuild/bin",
      ]
    }
  }
}

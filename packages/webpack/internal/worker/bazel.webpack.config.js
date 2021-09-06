class WebpackBazelPlugin {
  apply(compiler) {
    // compiler.hooks.afterEmit.tap('WebpackBazelPlugin', (compilation) => {
    //     compiler.watching.suspend();
    //     console.log('WEBPACK_BAZEL_PLUGIN_COMPILATION_FINISHED');
    //     return true;
    // });

    // compiler.hooks.failed.tap('WebpackBazelPlugin', (compilation) => {
    //     console.log('WEBPACK_BAZEL_PLUGIN_COMPILATION_FAILED');
    //     compiler.watching.suspend();
    //     return true;
    // });

    // process.stdin.on('data', async chunk => {
    //     if (chunk.toString().indexOf('IBAZEL_BUILD_COMPLETED SUCCESS') === -1) {
    //         return;
    //     }

    //     compiler.watching.resume();
    // });
  }
}



module.exports = {
  plugins: [new WebpackBazelPlugin()],
};
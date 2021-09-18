class IBazelPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('WebpackBazelPlugin', () => {
      compiler.watching.suspend();
      return true;
    });

    compiler.hooks.failed.tap('WebpackBazelPlugin', () => {
      compiler.watching.suspend();
      return true;
    });

    process.stdin.on('data', chunk => {
      const chunkString = chunk.toString();
      if (chunkString.indexOf('IBAZEL_BUILD_COMPLETED SUCCESS') !== -1) {
        compiler.watching.resume();
      } else if (chunkString.indexOf('IBAZEL_BUILD_STARTED') !== -1) {
        compiler.watching.suspend();
      }
    });
  }
}

module.exports = {
  plugins: [new IBazelPlugin()],
  watchOptions: {
    poll: 1,
  },
}

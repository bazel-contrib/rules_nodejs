const HtmlWebpackPlugin = require('html-webpack-plugin')
const TimeFixPlugin = require('time-fix-plugin')
const webpack = require('webpack')
const path = require('path')

module.exports = {
  // This ensures that we properly resolve this path from the bazel out tree under ibazel
  entry: path.resolve(__dirname, 'src/index.js'),
  mode: 'development',
  devtool: 'source-map',
  plugins: [
    // Creates the HTML pages
    new HtmlWebpackPlugin(),
    // Support HMR
    new webpack.HotModuleReplacementPlugin({
        // Options...
    }),
    // Prevents multi compiles
    new TimeFixPlugin(),
  ],
  // Disable terser because we will run this through webpack
  // when we actually build. Just slows down dev server
  optimization: {
    minimize: false,
  },
  devServer: {
    // Tells the server to be hot reloadable
    hot: true,
    // Don't reload the page since we are doing HMR
    liveReload: false,
    open: true,
    host: 'localhost',
    // Don't bother with compression on the dev server
    compress: false,
  },
  // Don't resolve symlinks during build & bundling. This MUST be set
  // since we turn off bazel node patches with --nobazel_node_patches to allow
  // the watcher to follow symlinks out of the sandbox & execroot. See comment
  // on watchOptions.followSymlinks below.
  resolve: {symlinks: false},
  // Cache must be false for HMR to work, otherwise it doesn't author a new hot module manifest
  cache: false,
  // Tells webpack to watch the file system for changes
  watch: true,
  watchOptions: {
    // Follow symlinks out of the sandbox & execroot so that
    // it can detect changes to the underlying files. Watching the symlinks
    // doesn't work since no change notifications is generated for a symlink
    // when the file it points to changes.
    // NB: this option only works under bazel with node patches disabled with --nobazel_node_patches
    followSymlinks: true,
    ignored: [
      '**/node_modules/**',
      '**/node_modules',
    ],
    // Necessary to debounce the io from ibazel constantly writing
    aggregateTimeout: 5000,
    // Necessary for HMR to be able to receive the changes
    poll: 4000,
  }
}

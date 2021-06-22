const { VueLoaderPlugin } = require('vue-loader')
const path = require('path');

module.exports = {
  mode: "development",
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      // this will apply to both plain `.js` files
      // AND `<script>` blocks in `.vue` files
      {
        test: /\.js$/,
        loader: 'babel-loader'
      },
      // this will apply to both plain `.css` files
      // AND `<style>` blocks in `.vue` files
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    // make sure to include the plugin!
    new VueLoaderPlugin()
  ],
  entry: './HelloWorld.vue',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
    library: "HelloWorld",
    libraryExport: 'default',
    libraryTarget: "umd",
  },
};


const commonjs = require('@rollup/plugin-commonjs')
const {nodeResolve} = require('@rollup/plugin-node-resolve')

module.exports = {
  plugins: [
    nodeResolve(),
    commonjs(),
  ],
}

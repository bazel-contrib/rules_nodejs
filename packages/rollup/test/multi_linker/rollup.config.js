const {nodeResolve} = require('@rollup/plugin-node-resolve')
const commonjs = require('@rollup/plugin-commonjs')

module.exports = {
  plugins: [
    nodeResolve(),
    commonjs(),
  ],
}

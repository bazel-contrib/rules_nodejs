// rollup.config.js
import typescript from '@rollup/plugin-typescript';

export default {
  plugins: [typescript({ allowJs: true })],
};
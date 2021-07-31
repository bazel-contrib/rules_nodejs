import { default as txtArrayPlugin } from './txt-array-plugin.js';
import { default as svgPlugin } from 'esbuild-plugin-svg';

export default {
    plugins: [
        txtArrayPlugin,
        svgPlugin(),
    ],
}

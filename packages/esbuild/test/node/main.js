const {get} = require('https');
const {getEnvVars} = require('./env');

const ESBUILD_TEST = getEnvVars().ESBUILD_TEST;

console.log(`ESBUILD_TEST=${ESBUILD_TEST}`);
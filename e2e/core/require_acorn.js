/**
 * @fileoverview minimal test program that requires a third-party package from npm
 */
const acorn = require('acorn');
require('fs').writeFileSync(
    process.argv[2],
    JSON.stringify(acorn.parse('1', {ecmaVersion: 2020})) + '\n');

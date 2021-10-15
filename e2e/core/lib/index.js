/**
 * @fileoverview minimal test program that requires a third-party package from npm
 */
 const acorn = require('acorn');
 
 function toAst(program) {
     return JSON.stringify(acorn.parse(program, {ecmaVersion: 2020})) + '\n';
 }
 
 module.exports = {toAst}
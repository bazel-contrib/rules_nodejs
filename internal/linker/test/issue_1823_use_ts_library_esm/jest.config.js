const isWindows = process.platform === 'win32';

module.exports = {
  testEnvironment: 'node',
  transform: {'^.+\\.mjs?$': 'babel-jest'},
  // More Shenanigans for Windows where jest is running both the original .mjs & the babel
  // transformed .js and fails. Not sure what why this is the case or exactly why changing
  // testMatch solves it but not a priority to solve:
  // ```
  // PASS ../../lib.test.js
  // FAIL ../../lib.test.mjs
  // C:\b\swkzcapm\execroot\build_bazel_rules_nodejs\bazel-out\x64_windows-fastbuild\bin\internal\linker\test\issue_1823_use_ts_library_esm\lib.test.mjs:1
  //     import { doStuff } from './lib';
  //     ^^^^^^
  // ```
  testMatch: [isWindows ? '**/?(*.)(spec|test).js?(x)' : '**/?(*.)(spec|test).?(m)js?(x)'],
  moduleFileExtensions: ['js', 'mjs'],
};

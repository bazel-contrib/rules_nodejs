/**
 * File that should mimic a file that is required for the tests to run. This file is used
 * to ensure that the Karma bazel rules properly include the file in the ConcatJS bundle.
 */

define('rules_nodejs/packages/karma/test/karma/init-test', [], () => {
  window['__testInitialized'] = true;
});

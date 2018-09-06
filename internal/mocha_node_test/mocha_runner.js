const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');

const mocha = new Mocha();

// Set the StackTraceLimit to infinity. This will make stack capturing slower, but more useful.
// Since we are running tests having proper stack traces is very useful and should be always set to
// the maximum (See: https://nodejs.org/api/errors.html#errors_error_stacktracelimit)
Error.stackTraceLimit = Infinity;

// tested files are provided as process.argv[2] and on
const filesToTest = process.argv.slice(2);
filesToTest.forEach(file => mocha.addFile(file));

// These exit codes are handled specially by Bazel:
// https://github.com/bazelbuild/bazel/blob/486206012a664ecb20bdb196a681efc9a9825049/src/main/java/com/google/devtools/build/lib/util/ExitCode.java#L44
const BAZEL_EXIT_TESTS_FAILED = 3;
const BAZEL_EXIT_NO_TESTS_FOUND = 4;


let hasFailure = false;
let hasTest = false;

const runner = mocha.run(function(failures) {
  if (failures) {
    hasFailure = true;
  }
});

runner.on('test', () => {
  hasTest = true;
});



process.on('exit', (code) => {
  // if the code has executed normally, potentially overwrite the process code
  // based on test results.
  if (code === 0) {
    if (hasFailure) {
      process.exitCode = BAZEL_EXIT_TESTS_FAILED;
    } else if (!hasTest) {
      process.exitCode = BAZEL_EXIT_NO_TESTS_FOUND;
    } 
  }
});

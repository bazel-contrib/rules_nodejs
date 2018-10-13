const fs = require('fs');
const path = require('path');
const JasmineRunner = require('jasmine/lib/jasmine');

const UTF8 = {
  encoding: 'utf-8'
};

// These exit codes are handled specially by Bazel:
// https://github.com/bazelbuild/bazel/blob/486206012a664ecb20bdb196a681efc9a9825049/src/main/java/com/google/devtools/build/lib/util/ExitCode.java#L44
const BAZEL_EXIT_TESTS_FAILED = 3;
const BAZEL_EXIT_NO_TESTS_FOUND = 4;

// Set the StackTraceLimit to infinity. This will make stack capturing slower, but more useful.
// Since we are running tests having proper stack traces is very useful and should be always set to
// the maximum (See: https://nodejs.org/api/errors.html#errors_error_stacktracelimit)
Error.stackTraceLimit = Infinity;

function main(args) {
  if (!args.length) {
    throw new Error('Spec file manifest expected argument missing');
  }
  const manifest = require.resolve(args[0]);
  // Remove the manifest, some tested code may process the argv.
  process.argv.splice(2, 1)[0];

  const jrunner = new JasmineRunner();
  if (args.length == 2) {
    jrunner.loadConfigFile(args[1])
  }
  fs.readFileSync(manifest, UTF8)
      .split('\n')
      .filter(l => l.length > 0)
      // Filter here so that only files ending in `spec.js` and `test.js`
      // are added to jasmine as spec files. This is important as other
      // deps such as "@npm//typescript" if executed may cause the test to
      // fail or have unexpected side-effects. "@npm//typescript" would
      // try to execute tsc, print its help, and process.exit(1)
      .filter(f => /[^a-zA-Z0-9](spec|test)\.js$/i.test(f))
      // Filter out files from node_modules that match test.js or spec.js
      .filter(f => !/\/node_modules\//.test(f))
      .forEach(f => jrunner.addSpecFile(f));

  var noSpecsFound = true;
  jrunner.addReporter({
    specDone: () => {
      noSpecsFound = false
    },
  });
  // addReporter throws away the default console reporter
  // so we need to add it back
  jrunner.configureDefaultReporter({});

  jrunner.onComplete((passed) => {
    let exitCode = passed ? 0 : BAZEL_EXIT_TESTS_FAILED;
    if (noSpecsFound) exitCode = BAZEL_EXIT_NO_TESTS_FOUND;
    process.exit(exitCode);
  });

  jrunner.execute();
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

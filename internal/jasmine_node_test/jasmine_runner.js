const fs = require('fs');
let JasmineRunner = null;

try {
  JasmineRunner = require('jasmine/lib/jasmine');
} catch (e) {
  if (e.code && e.code === 'MODULE_NOT_FOUND') {
    throw new Error('When using the "jasmine_node_test" rule, please make sure that the ' +
      '"jasmine" node module is available as a runtime dependency (add to "deps").\nRead more: ' +
      'https://github.com/bazelbuild/rules_nodejs#fine-grained-npm-package-dependencies.');
  }

  // In case the error is not about finding "jasmine" within the runfiles, just
  // rethrow the original exception so that it's still possible to debug.
  throw e;
}

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

  // Initialize jasmine with the jasmineCore in options so that if
  // global.jasmineCore is set then that jasmineCore will be used.
  // This is so that a bootstrap script provide a patched version of
  // jasmineCore if necessary. For example:
  // ```
  // const jasmineCore = require('jasmine-core');
  // const patchedJasmine = jasmineCore.boot(jasmineCore);
  // ...patch jasmine here...
  // jasmineCore.boot = function() { return patchedJasmine; };
  // global.jasmineCore = jasmineCore;
  // ```
  const jrunner = new JasmineRunner({jasmineCore: global.jasmineCore});
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

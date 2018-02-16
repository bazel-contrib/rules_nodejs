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

function main(args) {
  if (!args.length) {
    throw new Error('Spec file manifest expected argument missing');
  }
  const manifest = require.resolve(args[0]);
  // Remove the manifest, some tested code may process the argv.
  process.argv.splice(2, 1)[0];

  const jrunner = new JasmineRunner();
  fs.readFileSync(manifest, UTF8)
      .split('\n')
      .filter(l => l.length > 0)
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

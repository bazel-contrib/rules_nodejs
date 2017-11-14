const fs = require('fs');
const path = require('path');
const JasmineRunner = require('jasmine/lib/jasmine');

const UTF8 = {encoding: 'utf-8'};

// These exit codes are handled specially by Bazel:
// https://github.com/bazelbuild/bazel/blob/486206012a664ecb20bdb196a681efc9a9825049/src/main/java/com/google/devtools/build/lib/util/ExitCode.java#L44
const BAZEL_EXIT_TESTS_FAILED = 3;
const BAZEL_EXIT_NO_TESTS_FOUND = 4;


function main(args) {
  if (!args.length) {
    throw new Error('Spec file manifest expected argument missing');
  }
  const specFilesManifest = require.resolve(args[0]);
  // Remove the manifest, some tested code may process the argv.
  process.argv.splice(2, 1)[0];

  let testFiles =
      fs.readFileSync(specFilesManifest, UTF8)
      .split('\n')
      .filter(l => l.length > 0);
  if (!testFiles.length) {
    return BLAZE_EXIT_NO_TESTS_FOUND;
  }

  const jrunner = new JasmineRunner();

  // Unless the user overrides the timeout for a test, base the Jasmine timeout
  // on the Bazel one.
  //
  // Jasmine's timeout is per-test, not for the whole process. Also Jasmine
  // takes additional time to start. So setting Jasmine's timeout the same as
  // Bazel's should guarantee that users will see Bazel's timeout status, not a
  // failed status due to Jasmine internally throwing
  // "Async callback was not invoked within timeout specified by
  // jasmine.DEFAULT_TIMEOUT_INTERVAL"
  // This allows users to have a simpler mental model between languages: test
  // timeouts look similar, and you can increase the `timeout` attribute on any
  // `*_test` target to give it more time.
  //
  // This environment variable is set by Bazel, see
  // https://docs.bazel.build/versions/master/test-encyclopedia.html#initial-conditions
  if (process.env['TEST_TIMEOUT']) {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = process.env['TEST_TIMEOUT'] * 1000;
  }

  for (file of testFiles) {
    jrunner.addSpecFile(file);
  }

  jrunner.onComplete((passed) => {
    process.exit(passed ? 0 : BAZEL_EXIT_TESTS_FAILED);
  });

  jrunner.execute();
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

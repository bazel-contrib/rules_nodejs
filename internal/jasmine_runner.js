const fs = require('fs');
const path = require('path');
const JasmineRunner = require('jasmine/lib/jasmine.js');

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
  for (file of testFiles) {
    console.error('file', file);
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

const fs = require('fs');

let jasmineCore = null
let JasmineRunner = require('jasmine/lib/jasmine');
if (global.jasmine) {
  // global.jasmine has been initialized which means a bootstrap script
  // has already required `jasmine-core` and called jasmineCore.boot()
  jasmineCore = global.jasmineCore;
  if (!jasmineCore) {
    try {
      // Try unhoisted jasmine-core first so that we don't
      // need an @npm//jasmine-core dep in the unhoisted case.
      jasmineCore = require('jasmine/node_modules/jasmine-core');
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        // rethrow other errors
        throw e;
      }
      jasmineCore = require('jasmine-core');
    }
  }
  // Override the jasmineCore boot function so that the jasmine
  // runner gets the already initialize jasmine and its shared environment
  jasmineCore.boot = function() {
    return global.jasmine
  };
}

const UTF8 = {
  encoding: 'utf-8'
};

// These exit codes are handled specially by Bazel:
// https://github.com/bazelbuild/bazel/blob/486206012a664ecb20bdb196a681efc9a9825049/src/main/java/com/google/devtools/build/lib/util/ExitCode.java#L44
const BAZEL_EXIT_TESTS_FAILED = 3;
const BAZEL_EXIT_NO_TESTS_FOUND = 4;

// Test sharding support
// See https://docs.bazel.build/versions/master/test-encyclopedia.html#role-of-the-test-runner
const TOTAL_SHARDS = Number(process.env['TEST_TOTAL_SHARDS']);
const SHARD_INDEX = Number(process.env['TEST_SHARD_INDEX']);
// Tell Bazel that this test runner supports sharding by updating the last modified date of the
// magic file
if (TOTAL_SHARDS) {
  fs.open(process.env['TEST_SHARD_STATUS_FILE'], 'w', (err, fd) => {
    if (err) throw err;
    fs.close(fd, err => {
      if (err) throw err;
    });
  });
}

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

  const jrunner = new JasmineRunner({jasmineCore: jasmineCore});
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

  // Re-do logic from jrunner.execute() here so that
  // we can control which specs are executed below
  jrunner.loadRequires();
  jrunner.loadHelpers();
  if (!jrunner.defaultReporterConfigured) {
    jrunner.configureDefaultReporter({showColors: jrunner.showingColors});
  }
  jrunner.loadSpecs();
  jrunner.addReporter(jrunner.completionReporter);

  const allSpecs = getAllSpecs(jasmine.getEnv());
  if (TOTAL_SHARDS) {
    // Partition the specs among the shards.
    // This ensures that the specs are evenly divided over the shards.
    // Also it keeps specs in the same order and prefers to keep specs grouped together.
    // This way, common beforeEach/beforeAll setup steps aren't repeated as much over different
    // shards.
    const start = allSpecs.length * SHARD_INDEX / TOTAL_SHARDS;
    const end = allSpecs.length * (SHARD_INDEX + 1) / TOTAL_SHARDS;
    jasmine.getEnv().execute(allSpecs.slice(start, end));
  } else {
    jasmine.getEnv().execute(allSpecs);
  }

  return 0;
}

function getAllSpecs(jasmineEnv) {
  var specs = [];

  // Walk the test suite tree depth first and collect all test specs
  var stack = [jasmineEnv.topSuite()];
  var currentNode;
  while (currentNode = stack.pop()) {
    if (currentNode instanceof jasmine.Spec) {
      specs.unshift(currentNode);
    } else if (currentNode instanceof jasmine.Suite) {
      stack = stack.concat(currentNode.children);
    }
  }

  return specs.map(s => s.id);
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

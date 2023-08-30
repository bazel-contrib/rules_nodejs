const fs = require('fs');
const path = require('path');
const bazelJasmine = require('@bazel/jasmine');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

const JasmineRunner = bazelJasmine.jasmine;
const JUnitXmlReporter = bazelJasmine.JUnitXmlReporter;

let jasmineCore = null
if (global.jasmine) {
  // global.jasmine has been initialized which means a bootstrap script
  // has already required `jasmine-core` and called jasmineCore.boot()
  jasmineCore = global.jasmineCore;
  if (!jasmineCore) {
    jasmineCore = bazelJasmine.jasmineCore;
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
const BAZEL_EXIT_SUCCESS = 0;
const BAZEL_EXIT_TESTS_FAILED = 3;
const BAZEL_EXIT_NO_TESTS_FOUND = 4;
const BAZEL_EXIT_INTERRUPTED = 8;

// Test sharding support
// See https://docs.bazel.build/versions/main/test-encyclopedia.html#role-of-the-test-runner
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

const IS_TEST_FILE = /[^a-zA-Z0-9](spec|test)\.(mjs|cjs|js)$/i;
const IS_NODE_MODULE = /\/node_modules\//

// We process arguments by splicing them out of the process.argv
// Users could set their own templated_args on their test, then
// the tested code might process the argv
// So it shouldn't see these Bazel-specific ones
function readArg() {
  return process.argv.splice(2, 1)[0];
}

async function main(args) {
  if (args.length < 2) {
    throw new Error('expected argument missing');
  }

  // first args is always the path to the manifest
  const manifest = runfiles.resolveWorkspaceRelative(readArg());
  // config file is the next arg
  const configFile = readArg();

  const jrunner = new JasmineRunner({jasmineCore: jasmineCore});
  if (configFile !== '--noconfig') {
    jrunner.loadConfigFile(runfiles.resolveWorkspaceRelative(configFile));
  }
  fs.readFileSync(manifest, UTF8)
      .split('\n')
      .filter(l => l.length > 0)
      // Filter out files from node_modules
      .filter(f => !IS_NODE_MODULE.test(f))
      // Use runfiles resolve to resolve the file path that
      // bazel passes to the runner to its absolute path
      .map(f => runfiles.resolveWorkspaceRelative(f))
      // Filter here so that only files ending in `spec.js` and `test.js`
      // are added to jasmine as spec files. This is important as other
      // deps such as "@npm//typescript" if executed may cause the test to
      // fail or have unexpected side-effects. "@npm//typescript" would
      // try to execute tsc, print its help, and process.exit(1)
      .filter(f => IS_TEST_FILE.test(f))
      .forEach(f => jrunner.addSpecFile(f));

  if (JUnitXmlReporter) {
    const testOutputFile = process.env.XML_OUTPUT_FILE;
    if (testOutputFile) {
      jrunner.addReporter(new JUnitXmlReporter({
        filePrefix: path.basename(testOutputFile),
        savePath: path.dirname(testOutputFile),
        consolidate: true,
        consolidateAll: true
      }));

      // addReporter throws away the default console reporter
      // so we need to add it back
      jrunner.configureDefaultReporter({});
    } else {
      console.warn('Skipping XML Test Result: $XML_OUTPUT_FILE not found.')
    }
  }

  if (TOTAL_SHARDS) {
    // Since we want to collect all the loaded specs, we have to do this after
    // loadSpecs() in jasmine/lib/jasmine.js
    // However, we must add our filter before the runnable specs are calculated
    // so that our filtering is applied.
    // The jasmineStarted() callback is called by the "inner" execute function
    // in jasmine-core, which is too late.
    // Patch the inner execute function to do our filtering first.
    const env = jasmine.getEnv();
    const originalExecute = env.execute.bind(env);
    env.execute = () => {
      const allSpecs = getAllSpecs(env);
      // Partition the specs among the shards.
      // This ensures that the specs are evenly divided over the shards.
      // Also it keeps specs in the same order and prefers to keep specs grouped together.
      // This way, common beforeEach/beforeAll setup steps aren't repeated as much over different
      // shards.
      const start = allSpecs.length * SHARD_INDEX / TOTAL_SHARDS;
      const end = allSpecs.length * (SHARD_INDEX + 1) / TOTAL_SHARDS;
      const enabledSpecs = allSpecs.slice(start, end);
      env.configure({specFilter: (s) => enabledSpecs.includes(s.id)});

      return originalExecute();
    };

    // Special case!
    // To allow us to test sharding, always run the specs in the order they are declared
    if (process.env['TEST_WORKSPACE'] === 'build_bazel_rules_nodejs' &&
        process.env['TEST_TARGET'].startsWith('//packages/jasmine/test:sharding_')) {
      jrunner.randomizeTests(false);
    }
  }

  // TODO(6.0): remove support for deprecated versions of Jasmine that use the old API &
  // remember to update the `peerDependencies` as well.
  // Jasmine versions prior to 4.0.0 should use the old API.
  if (+jrunner.coreVersion().charAt(0) < 4) {
    console.warn(`DEPRECATED: Support for Jasmine versions prior to '4.0.x' is deprecated in '@bazel/jasmine'.`);

    // Old Jasmine API.
    let noSpecsFound = true;
    jrunner.addReporter({
      specDone: () => {
        noSpecsFound = false
      },
    });

    jrunner.onComplete((passed) => {
      let exitCode = passed ? BAZEL_EXIT_SUCCESS : BAZEL_EXIT_TESTS_FAILED;
      if (noSpecsFound) exitCode = BAZEL_EXIT_NO_TESTS_FOUND;

      process.exit(exitCode);
    });

    // addReporter throws away the default console reporter
    // so we need to add it back
    jrunner.configureDefaultReporter({});
    await jrunner.execute();

    return BAZEL_EXIT_SUCCESS;
  }

  // New Jasmine API.
  jrunner.exitOnCompletion = false;
  const { overallStatus, incompleteReason } = await jrunner.execute();

  switch (overallStatus) {
    case 'passed':
      return BAZEL_EXIT_SUCCESS;
    case 'incomplete':
      return incompleteReason === 'No specs found' ? BAZEL_EXIT_NO_TESTS_FOUND : BAZEL_EXIT_INTERRUPTED;
    case 'failed':
    default:
      return BAZEL_EXIT_TESTS_FAILED;
  }
}

function getAllSpecs(jasmineEnv) {
  const specs = [];

  // Walk the test suite tree depth first and collect all test specs
  const stack = [jasmineEnv.topSuite()];
  let currentNode;
  while (currentNode = stack.pop()) {
    if (!currentNode) {
      continue;
    }

    const { children, id } = currentNode;
    if (Array.isArray(children)) {
      // This is a suite.
      stack.push(...children);
    } else if (id) {
      // This is a spec.
      specs.unshift(currentNode);
    }
  }

  return specs.map(s => s.id);
}

if (require.main === module) {
  (async () => {
    try {
      process.exitCode = await main(process.argv.slice(2));
    } catch (error) {
      console.error('[jasmine_runner.js] An error has been reported:', error);
      process.exitCode = 1;
    }
  })();
}

const fs = require('fs');
const path = require('path');
const bazelJasmine = require('@bazel/jasmine');

const JasmineRunner = bazelJasmine.jasmine;

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

const IS_TEST_FILE = /[^a-zA-Z0-9](spec|test)\.js$/i;
const IS_NODE_MODULE = /\/node_modules\//

function main(args) {
  if (!args.length) {
    throw new Error('Spec file manifest expected argument missing');
  }
  // first args is always the path to the manifest
  const manifest = require.resolve(args[0]);
  // second is always a flag to enable coverage or not
  const coverageArg = args[1];
  const enableCoverage = coverageArg === '--coverage';

  // Remove the manifest, some tested code may process the argv.
  // Also remove the --coverage flag
  process.argv.splice(2, 2)[0];

  // the relative directory the coverage reporter uses to find anf filter the files
  const cwd = process.cwd()

  const jrunner = new JasmineRunner({jasmineCore: jasmineCore});
  if (args.length == 3) {
    jrunner.loadConfigFile(args[2]);
  }
  const allFiles = fs.readFileSync(manifest, UTF8)
                       .split('\n')
                       .filter(l => l.length > 0)
                       // Filter out files from node_modules
                       .filter(f => !IS_NODE_MODULE.test(f))

  const sourceFiles = allFiles
                          // Filter out all .spec and .test files so we only report
                          // coverage against the source files
                          .filter(f => !IS_TEST_FILE.test(f))
                          // the jasmine_runner.js gets in here as a file to run
                          .filter(f => !f.endsWith('jasmine_runner.js'))
                          .map(f => require.resolve(f))
                          // the reporting lib resolves the relative path to our cwd instead of
                          // using the absolute one so match it here
                          .map(f => path.relative(cwd, f))

  allFiles
      // Filter here so that only files ending in `spec.js` and `test.js`
      // are added to jasmine as spec files. This is important as other
      // deps such as "@npm//typescript" if executed may cause the test to
      // fail or have unexpected side-effects. "@npm//typescript" would
      // try to execute tsc, print its help, and process.exit(1)
      .filter(f => IS_TEST_FILE.test(f))
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


  let covExecutor;
  let covDir;
  if (enableCoverage) {
    // lazily pull these deps in for only when we want to collect coverage
    const crypto = require('crypto');
    const Execute = require('v8-coverage/src/execute');

    // make a tmpdir inside our tmpdir for just this run
    covDir = path.join(process.env['TEST_TMPDIR'], String(crypto.randomBytes(4).readUInt32LE(0)));
    covExecutor = new Execute({include: sourceFiles, exclude: []});
    covExecutor.startProfiler();
  }

  jrunner.onComplete((passed) => {
    let exitCode = passed ? 0 : BAZEL_EXIT_TESTS_FAILED;
    if (noSpecsFound) exitCode = BAZEL_EXIT_NO_TESTS_FOUND;

    if (enableCoverage) {
      const Report = require('v8-coverage/src/report');
      covExecutor.stopProfiler((err, data) => {
        if (err) {
          console.error(err);
          process.exit(1);
        }
        const sourceCoverge = covExecutor.filterResult(data.result);
        // we could do this all in memory if we wanted
        // just take a look at v8-coverage/src/report.js and reimplement some of those methods
        // but we're going to have to write a file at some point for bazel coverage
        // so may as well support it now
        // the lib expects these paths to exist for some reason
        fs.mkdirSync(covDir);
        fs.mkdirSync(path.join(covDir, 'tmp'));
        // only do a text summary for now
        // once we know what format bazel coverage wants we can output
        // lcov or some other format
        const report = new Report(covDir, ['text-summary']);
        report.store(sourceCoverge);
        report.generateReport();

        process.exit(exitCode);
      });
    } else {
      process.exit(exitCode);
    }

    
  });

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
      originalExecute();
    };
    // Special case!
    // To allow us to test sharding, always run the specs in the order they are declared
    if (process.env['TEST_WORKSPACE'] === 'npm_bazel_jasmine' &&
        process.env['BAZEL_TARGET'] === '//test:sharding_test') {
      jrunner.randomizeTests(false);
    }
  }

  jrunner.execute();
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

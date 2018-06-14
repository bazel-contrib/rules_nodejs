const fs = require('fs');
const path = require('path');
const JasmineRunner = require('jasmine/lib/jasmine');
const {createInterface} = require('readline');

const UTF8 = {
  encoding: 'utf-8'
};

// These exit codes are handled specially by Bazel:
// https://github.com/bazelbuild/bazel/blob/486206012a664ecb20bdb196a681efc9a9825049/src/main/java/com/google/devtools/build/lib/util/ExitCode.java#L44
const BAZEL_EXIT_TESTS_FAILED = 3;
const BAZEL_EXIT_NO_TESTS_FOUND = 4;

// ibazel will write this string after a successful build
// We don't want to re-trigger tests if the compilation fails, so
// we should only listen for this event.
const IBAZEL_NOTIFY_BUILD_SUCCESS = 'IBAZEL_BUILD_COMPLETED SUCCESS';
const IBAZEL_NOTIFY_CHANGES = 'IBAZEL_NOTIFY_CHANGES';

// Set the StackTraceLimit to infinity. This will make stack capturing slower, but more useful.
// Since we are running tests having proper stack traces is very useful and should be always set to
// the maximum (See: https://nodejs.org/api/errors.html#errors_error_stacktracelimit)
Error.stackTraceLimit = Infinity;

function iBazelMode(manifestLocation) {
  // ibazel communicates with us via stdin
  console.log('IBAZEL MODE')

  const run =
      () => {
        const jrunner = createRunner(true);
        jrunner.onComplete(() => {});
        addFiles(manifestLocation, jrunner);
        jrunner.execute();
      }

  const rl = createInterface({input: process.stdin, terminal: false});
  rl.on('line', chunk => {
    console.log('IBAZEL WRITE')
    if (chunk === IBAZEL_NOTIFY_BUILD_SUCCESS) {
      run();
    }
  });
  rl.on('close', () => {
    console.log('IBAZEL KILL')
    // Give ibazel 5s to kill our process, otherwise do it ourselves
    setTimeout(() => {
      console.error('ibazel failed to stop jasmine after 5s; probably a bug');
      process.exit(1);
    }, 5000);
  });

  run();
}

function deleteFromCache(fileName) {
  // jasmine uses `require(fileName)` to read the files into the program
  // so we have to delete them from the cache to ensure they read again on subsequent runs
  // when in ibazel mode
  delete require.cache[require.resolve(fileName)];
}

function addFiles(manifestLocation, jrunner){
  deleteFromCache(manifestLocation)

  const manifest = require.resolve(manifestLocation);
  fs.readFileSync(manifest, UTF8).split('\n').filter(l => l.length > 0).forEach(f => {
    // ensure it's actually read from disk again
    deleteFromCache(f);
    try {
      // try requiring it incase there are syntax errors that kills the program later on
      require(f);
      jrunner.addSpecFile(f);
    } catch (error) {
      // dont add the files to jasmine since it'll run them and it'll kill the process
      console.error(`Error reading file, it will be ignored for this run: ${require.resolve(f)} `)
      console.error(error)
    }
  });
}

var noSpecsFound;
function createRunner() {
  const jrunner = new JasmineRunner();

  noSpecsFound = true;
  jrunner.addReporter({
    specDone: () => {
      noSpecsFound = false
    },
  });
  
  // addReporter throws away the default console reporter
  // so we need to add it back
  jrunner.configureDefaultReporter({});

  return jrunner;
}

function main(args) {
  if (!args.length) {
    throw new Error('Spec file manifest expected argument missing');
  }
  const manifestLocation = args[0];
  // Remove the manifest, some tested code may process the argv.
  process.argv.splice(2, 1)[0];

  const isIBazelMode = Boolean(process.env[IBAZEL_NOTIFY_CHANGES]);

  if (isIBazelMode) {
    iBazelMode(manifestLocation);
  } else {
    const jrunner = createRunner();
    addFiles(manifestLocation, jrunner);
    jrunner.execute();
    jrunner.onComplete((passed) => {
      let exitCode = passed ? 0 : BAZEL_EXIT_TESTS_FAILED;
      if (noSpecsFound) {
        exitCode = BAZEL_EXIT_NO_TESTS_FOUND;
      }
      process.exit(exitCode);
    });
    return 0;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
'use strict';

let worker;
try {
  worker = require('./worker');
} catch {
  // TODO: rely on the linker to link the first-party package
  const helper = process.env['BAZEL_NODE_RUNFILES_HELPER'];
  if (!helper) throw new Error('No runfiles helper and no @bazel/worker npm package');
  const runfiles = require(helper);
  const workerRequire =
      runfiles.resolve('build_bazel_rules_nodejs/packages/labs/esbuild/worker.js');
  if (!workerRequire)
    throw new Error(`build_bazel_rules_nodejs/packages/labs/esbuild/worker.js missing in runfiles ${
        JSON.stringify(runfiles.manifest)}, ${runfiles.dir}`);
  worker = require(workerRequire);
}

const {debug, log, runAsWorker, runWorkerLoop} = worker;
const esbuild = require('esbuild');
const fs = require('fs');
const minimist = require('minimist');

const args = process.argv.slice(2);

if (runAsWorker(args)) {
  debug('Starting esbuild persistent worker...');

  esbuild.startService().then((service) => {
    process.on('beforeExit', () => {
      service.stop();
    });

    runWorkerLoop(async (args) => {
      const options = getBuildOptions(args);

      log(options);

      try {
        await service.build(options);
        return true;
      } catch (e) {
        log(e);
        return false;
      }
    });
  });

  // Note: intentionally don't process.exit() here, because runWorkerLoop
  // is waiting for async callbacks from node.
} else {
  debug('Running a single bundle...');
  if (args.length === 0) throw new Error('Not enough arguments');
  if (args.length !== 1) {
    throw new Error('Expected one argument: path to flagfile');
  }

  // Bazel worker protocol expects the only arg to be @<path_to_flagfile>.
  // When we are running a single build, we remove the @ prefix and read the list
  // of actual arguments line by line.
  const configFile = args[0].replace(/^@+/, '');
  const configContent = fs.readFileSync(configFile, 'utf8').trim();

  const options = getBuildOptions(configContent.split('\n'));

  esbuild.buildSync(options);
}

process.exitCode = 0;

function getBuildOptions(args) {
  const argv = minimist(args);

  const options = {
    entryPoints: argv['_'],
    bundle: argv['bundle'],
    outfile: argv['outfile'],
    outdir: argv['outdir'],
    platform: argv['platform'],
    loader: repeatedArgs(argv, 'loader'),
    define: repeatedArgs(argv, 'define'),
    target: argv['target'],
    logLevel: argv['log-level'],
    tsconfig: argv['tsconfig'],
    external: repeatedArgs(argv, 'external', 'array'),
  };
  if (argv['sourcemap']) {
    options.sourcemap = argv['sourcemap'];
  }
  if (argv['minify']) {
    options.minify = argv['minify'];
  }
  if (argv['splitting']) {
    options.splitting = argv['splitting'];
  }
  if (argv['format']) {
    options.format = argv['format'];
  }
  if (argv['metafile']) {
    options.metafile = argv['metafile'];
  }

  return options;
}

function repeatedArgs(argv, argName, typeHint) {
  let arg = argv[argName];
  if (!arg) {
    return typeHint === 'array' ? [] : {};
  }
  arg = Array.isArray(arg) ? arg : [arg];

  let ret;
  let addArg;
  if (arg.some((val) => val.includes('='))) {
    ret = {};
    addArg = (arg) => {
      const [key, val] = arg.split('=');
      ret[key] = val;
    };
  } else {
    ret = [];
    addArg = (arg) => {
      ret.push(arg);
    };
  }

  for (const val of arg) {
    addArg(val);
  }

  return ret;
}

#!/usr/bin/env node
/**
 * @fileoverview wraps the terser CLI to support minifying a directory
 * Terser doesn't support it; see https://github.com/terser/terser/issues/75
 * TODO: maybe we should generalize this to a package which would be useful outside
 *       bazel; however we would have to support the full terser CLI and not make
 *       assumptions about how the argv looks.
 */
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const os = require('os')

// Run Bazel with --define=VERBOSE_LOGS=1 to enable this logging
const VERBOSE_LOGS = !!process.env['VERBOSE_LOGS'];

function log_verbose(...m) {
  if (VERBOSE_LOGS) console.error('[terser/index.js]', ...m);
}

// Peek at the arguments to find any directories declared as inputs
let argv = process.argv.slice(2);
// terser_minified.bzl always passes the inputs first,
// then --output [out], then remaining args
// We want to keep those remaining ones to pass to terser
// Avoid a dependency on a library like minimist; keep it simple.
const outputArgIndex = argv.findIndex((arg) => arg.startsWith('--'));

const inputs = argv.slice(0, outputArgIndex);
const output = argv[outputArgIndex + 1];
const residual = argv.slice(outputArgIndex + 2);

log_verbose(`Running terser/index.js
  inputs: ${inputs}
  output: ${output}
  residual: ${residual}`);

function isDirectory(input) {
  return fs.lstatSync(path.join(process.cwd(), input)).isDirectory();
}

function terserDirectory(input) {
  if (!fs.existsSync(output)) {
    fs.mkdirSync(output);
  }

  let work = []
  let concurrency = (os.cpus().length-1||1);
  let active = 0
  errors = []

  function done(){
    if(work.length) exec(work.shift()); 
    else if(!active) {
      // todo actuall resolve
      if(errors.length) {
        console.error(JSON.stringify(errors,null,'  '));
        process.exit(1)
      }

      // NOTE: PROGRAM IS FINISHED HERE
    }
  }

  function exec([inputFile,outputFile]){
    active++;
    let args = [process.execPath,require.resolve('terser/bin/uglifyjs'),inputFile, '--output', outputFile, ...residual]
    child_process.exec(args.join(' '),(err,stdout,stderr)=>{
      if(err){
        errors.push({error:err,stderr:stderr+'',args});
      }
      process.stdout.write(stdout);
      done()
    })
  }

  fs.readdirSync(input).forEach(f => {
    if (f.endsWith('.js')) {

      const inputFile = path.join(input, path.basename(f));
      const outputFile = path.join(output, path.basename(f));
      // We don't want to implement a command-line parser for terser
      // so we invoke its CLI as child processes, just altering the input/output
      // arguments. See discussion: https://github.com/bazelbuild/rules_nodejs/issues/822
      // FIXME: this causes unlimited concurrency, which will definitely eat all the RAM on your
      // machine;
      //        we need to limit the concurrency with something like the p-limit package.
      // TODO: under Node 12 it should use the worker threads API to saturate all local cores
      
      if(active < concurrency){
        exec([inputFile, outputFile])
      } else {
        work.push([inputFile,outputFile])
      }

      //child_process.fork(
      //    // Note that the fork API doesn't do any module resolution.
      //    require.resolve('terser/bin/uglifyjs'), [inputFile, '--output', outputFile, ...residual]);
    }
  });
}

if (!inputs.find(isDirectory)) {
  // Inputs were only files
  // Just use terser CLI exactly as it works outside bazel
  require('terser/bin/uglifyjs');
} else if (inputs.length > 1) {
  // We don't know how to merge multiple input dirs to one output dir
  throw new Error('terser_minified only allows a single input when minifying a directory');
} else {
  terserDirectory(inputs[0]);
}
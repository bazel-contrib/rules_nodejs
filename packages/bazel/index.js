#!/usr/bin/env node

// This file is a shim to execute the bazel binary from the right platform-specific package.
const os = require('os');
const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;

/**
 * @returns the native `bazel` binary for the current platform
 * @throws when the `bazel` executable can not be found
 */
function getNativeBinary() {
  const platform = [os.platform(), os.arch()].join('_');
  const platformPackageJson = `@bazel/bazel-${platform}/package.json`;
  let nativePackage;
  try {
    nativePackage = require.resolve(platformPackageJson);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      // rethrow other errors
      throw e;
    }
    throw new Error(
        `FATAL: Bazel has not published an executable for your platform (${platform})\n` +
        'Consider installing it following instructions at https://bazel.build instead.\n');
  }

  const binary = JSON.parse(fs.readFileSync(nativePackage))['bin']['bazel'];
  return path.resolve(path.dirname(nativePackage), binary);
}

if (require.main === module) {
  /** Starts a new synchronous child process that runs Bazel with the specified arguments. */
  const bazelProcess = spawnSync(getNativeBinary(), process.argv.slice(2), {stdio: 'inherit'});

  // Ensure that this wrapper script exits with the same exit code as the child process.
  process.exit(bazelProcess.status);
}

module.exports = {
  getNativeBinary,
};

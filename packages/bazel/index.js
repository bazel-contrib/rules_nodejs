#!/usr/bin/env node

// This file is a shim to execute the bazel binary from the right platform-specific package.
const os = require('os');
const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;

const warnGlobalInstall = `
  *** WARNING
    The Bazel binary is being run from a global install.

    This means the version may not match the one used in your project.
    We recommend installing the @bazel/bazel package locally in your project.
  ***
  `;

/**
 * @returns the native `bazel` binary for the current platform
 * @throws when the `bazel` executable can not be found
 */
function getNativeBinary() {
  const platform = [os.platform(), os.arch()].join('_');
  const platformPackageJson = `@bazel/bazel-${platform}/package.json`;
  let nativePackage;
  try {
    // First, look for the package locally installed under the current working directory
    nativePackage = require.resolve(platformPackageJson, {paths: [process.cwd()]});
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      // rethrow other errors
      throw e;
    }
    try {
      // Fall back to resolving the package anywhere, but if it succeeds, warn the user that we
      // don't recommend relying on a global installation.
      nativePackage = require.resolve(platformPackageJson);
      console.error(warnGlobalInstall);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        // rethrow other errors
        throw e;
      }
      // Give up on resolving the correct package anywhere
      console.error(
          `FATAL: Bazel has not published an executable for your platform. (${platform})\n` +
          'Consider installing it following instructions at https://bazel.build instead.\n');
      process.exit(1);
    }
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

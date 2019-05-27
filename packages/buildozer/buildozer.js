#!/usr/bin/env node

// This file is a shim to execute the buildozer binary from the right platform-specific package.
const os = require('os');
const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;

/**
 * @returns the native `buildozer` binary for the current platform
 * @throws when the `buildozer` executable can not be found
 */
function getNativeBinary() {
  const nativePackage =
      require.resolve(`@bazel/buildozer-${os.platform()}_${os.arch()}/package.json`);
  if (!fs.existsSync(nativePackage)) {
    const message = 'Bazel has not published a buildozer executable for your platform. ' +
        `(${os.platform()}_${os.arch()})\n` +
        'Consider building it from source instead.\n';
    throw new Error(message);
  }
  const binary = JSON.parse(fs.readFileSync(nativePackage))['bin']['buildozer'];
  return path.resolve(path.dirname(nativePackage), binary);
}

/** Starts a new synchronous child process that runs buildozer with the specified arguments. */
const buildozerProcess = spawnSync(getNativeBinary(), process.argv.slice(2), {stdio: 'inherit'});

// Ensure that this wrapper script exits with the same exit code as the child process.
process.exit(buildozerProcess.status);

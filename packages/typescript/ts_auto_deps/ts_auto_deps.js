#!/usr/bin/env node

// This file is a shim to execute the ts_auto_deps binary from the right platform-specific package.
const os = require('os');
const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;

/**
 * @return '.exe' for Windows and '' for all other platforms
 */
function getNativeBinaryExt() {
  return os.platform() === 'win32' ? '.exe' : '';
}

/**
 * @return the native `ts_auto_deps` binary for the current platform
 * @throws when the `ts_auto_deps` executable can not be found
 */
function getNativeBinary() {
  try {
    return require.resolve(`./ts_auto_deps-${os.platform()}_${os.arch()}${getNativeBinaryExt()}`);
  } catch (e) {
    const message = 'ts_auto_deps executable not found for your platform: ' +
        `(${os.platform()}_${os.arch()})\n`;
    throw new Error(message);
  }
}

/** Starts a new synchronous child process that runs with the specified arguments. */
const spawnedProcess = spawnSync(getNativeBinary(), process.argv.slice(2), {stdio: 'inherit'});

// Ensure that this wrapper script exits with the same exit code as the child process.
process.exit(spawnedProcess.status);

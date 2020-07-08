// this does not actually patch child_process
// but adds support to ensure the registered loader is included in all nested executions of nodejs.
const fs = require('fs');
const path = require('path');

export const patcher = (requireScriptName: string, binDir?: string) => {
  requireScriptName = path.resolve(requireScriptName);
  const dir = path.dirname(requireScriptName);
  const file = path.basename(requireScriptName);
  const nodeDir = path.join(binDir || dir, '_node_bin');

  if (!process.env.NP_SUBPROCESS_BIN_DIR) {
    // TODO: WINDOWS.
    try {
      fs.mkdirSync(nodeDir, {recursive: true});
    } catch (e) {
      // with node versions that don't have recursive mkdir this may throw an error.
      if (e.code !== 'EEXIST') {
        throw e;
      }
    }
    if (process.platform == 'win32') {
      fs.writeFileSync(path.join(nodeDir, 'node.bat'), `@if not defined DEBUG_HELPER @ECHO OFF
set NP_SUBPROCESS_BIN_DIR=${nodeDir}
set Path=${nodeDir};%Path%
"${process.execPath}" --require "${requireScriptName}" %*
        `)
    } else {
      fs.writeFileSync(
          path.join(nodeDir, 'node'), `#!/bin/bash
export NP_SUBPROCESS_BIN_DIR="${nodeDir}"
export PATH="${nodeDir}":\$PATH
if [[ ! "\${@}" =~ "${file}" ]]; then
  exec ${process.execPath} --require "${requireScriptName}" "$@"
else
  exec ${process.execPath} "$@"
fi
  `,
          {mode: 0o777});
    }
  }

  if (!process.env.PATH) {
    process.env.PATH = nodeDir;
  } else if (process.env.PATH.indexOf(nodeDir + path.delimiter) === -1) {
    process.env.PATH = nodeDir + path.delimiter + process.env.PATH;
  }

  // fix execPath so folks use the proxy node
  if (process.platform == 'win32') {
    // FIXME: need to make an exe, or run in a shell so we can use .bat
  } else {
    process.argv[0] = process.execPath = path.join(nodeDir, 'node');
  }


  // replace any instances of require script in execArgv with the absolute path to the script.
  // example: bazel-require-script.js
  process.execArgv.map(v => {
    if (v.indexOf(file) > -1) {
      return requireScriptName;
    }
    return v;
  });
};

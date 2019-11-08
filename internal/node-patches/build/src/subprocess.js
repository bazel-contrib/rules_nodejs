"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// this does not actually patch child_process
// but adds support to ensure the registered loader is included in all nested executions of nodejs.
const fs = require('fs');
const path = require('path');
exports.patcher = (requireScriptName) => {
    requireScriptName = path.resolve(requireScriptName);
    const dir = path.dirname(requireScriptName);
    const file = path.basename(requireScriptName);
    const nodeDir = path.join(dir, '_node_bin');
    if (!fs.existsSync(nodeDir)) {
        //TODO: WINDOWS.
        fs.mkdirSync(nodeDir);
        fs.writeFileSync(path.join(nodeDir, 'node'), `#!/bin/bash
export PATCHED_NODEJS=1
export PATH=${nodeDir}:$PATH
hasScript=\`echo "$@" | grep ${path.basename(__filename)}\`
if [ "$hasScript"=="" ]; then
  exec ${process.execPath} --require "${__filename}" "$@"
else
  exec ${process.execPath} "$@"
fi
  `, { mode: 0o777 });
    }
    if (!process.env.PATH) {
        process.env.PATH = nodeDir;
    }
    else if (process.env.PATH.indexOf(nodeDir + path.delimiter) === -1) {
        process.env.PATH = nodeDir + path.delimiter + process.env.PATH;
    }
    // fix execPath so folks use the proxy node
    process.argv[0] = process.execPath = path.join(nodeDir, 'node');
    // replace any instances of require script in execArgv with the absolute path to the script.
    // example: bazel-require-script.js
    process.execArgv.map(v => {
        if (v.indexOf(file) > -1) {
            return requireScriptName;
        }
        return v;
    });
};
//# sourceMappingURL=subprocess.js.map
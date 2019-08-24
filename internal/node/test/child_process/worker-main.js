const childProcess = require('child_process');
console.log('WORKER-MAIN');
require('lib');

// each one of these will throw if the patcher script has not been run on the child
new childProcess.fork(__dirname + '/worker-thread.js');
childProcess.execSync(`node -e 'console.log("exec1"); require("lib")'`, {stdio: 'inherit'})
childProcess.spawnSync('node', ['-e', 'console.log("spawn1"); require("lib")'], {stdio: 'inherit'})
childProcess.spawnSync(
    process.execPath, ['-e', 'console.log("spawn2"); require("lib")'], {stdio: 'inherit'})

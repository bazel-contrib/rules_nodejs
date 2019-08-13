const childProcess = require('child_process');
console.log('WORKER-MAIN');
require('lib');
new childProcess.fork(__dirname + '/worker-thread.js');

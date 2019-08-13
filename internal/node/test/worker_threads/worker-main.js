const workerThreads = require('worker_threads');
console.log('WORKER-MAIN');
require('lib');
new workerThreads.Worker(__dirname + '/worker-thread.js');

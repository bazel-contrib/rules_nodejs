const {parentPort, workerData} = require("worker_threads");

console.log(workerData.message);
parentPort.postMessage(true);
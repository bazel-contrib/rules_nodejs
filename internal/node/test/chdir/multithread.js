const { Worker } = require("worker_threads")

function runWorker(message) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./worker.js", {workerData: {message}});
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", code => {
      if (0 !== code) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  })
}

(async () => {
    await runWorker("foobar");
})();
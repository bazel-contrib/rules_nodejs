import {isMainThread, parentPort, Worker} from 'worker_threads';

if (isMainThread) {
  new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: 1,
    });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code: number) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  })
      .then(
          // tslint:disable-next-line:no-any
          (result: any) => {
            console.log(JSON.stringify({
              mainThread: [
                process.execPath,
                process.execArgv,
                process.argv,
                process.env.PATH,
              ],
              worker: JSON.parse(result),
            }));
          },
          (err: Error) => {
            throw err;
          });
} else {
  parentPort!.postMessage(JSON.stringify([
    process.execPath,
    process.execArgv,
    process.argv,
    process.env.PATH,
  ]));
}

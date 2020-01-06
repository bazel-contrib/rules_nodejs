import {INestApplication, Logger} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {ExpressAdapter} from '@nestjs/platform-express';
import * as cluster from 'cluster';
import * as os from 'os';

import {AppModule} from './app.module';

export async function bootstrap(port: number): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  await app.listen(port);
  Logger.log(`Application served at http://localhost:${port}`);
  return app;
}

export async function bootstrapCluster(port: number): Promise<cluster.Worker[]|void> {
  return new Promise((resolve, reject) => {
    if (cluster.isMaster) {
      const cpuCount = os.cpus().length;

      for (let i = 0; i < cpuCount; i += 1) {
        cluster.fork();
      }

      let workers = [];
      cluster.on('online', worker => {
        Logger.log('Worker ' + worker.process.pid + ' is online.');
        workers.push(worker);
        if (workers.length === cpuCount) {
          resolve(workers);
        }
      });
      cluster.on('exit', ({process}, code, signal) => {
        Logger.log('worker ' + process.pid + ' died.');
      });
    } else {
      bootstrap(port);
      resolve();
    }
  })
}

if (require.main === module) {
  const argv = require('minimist')(process.argv.slice(2));
  bootstrapCluster(argv.port || 3000);
}

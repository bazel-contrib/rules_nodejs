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

function main(port: number) {
  if (cluster.isMaster) {
    const cpuCount = os.cpus().length;

    for (let i = 0; i < cpuCount; i += 1) {
      cluster.fork();
    }

    cluster.on('online', worker => {
      Logger.log('Worker ' + worker.process.pid + ' is online.');
    });
    cluster.on('exit', ({process}, code, signal) => {
      Logger.log('worker ' + process.pid + ' died.');
    });
  } else {
    bootstrap(port);
  }
}

if (require.main === module) {
  const argv = require('minimist')(process.argv.slice(2));
  main(argv.port || 3000);
}

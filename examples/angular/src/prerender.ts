import 'zone.js/dist/zone-node';
import 'reflect-metadata';

import { readFileSync, writeFileSync } from 'fs';
import { renderModule } from '@angular/platform-server';
import * as domino from 'domino';

const rootIndexPathFlagIdx = process.argv.findIndex(arg => arg === '--index');
const rootIndexPath = process.argv[rootIndexPathFlagIdx + 1];

const routesFlagIdx = process.argv.findIndex(arg => arg === '--routes');
const routes = process.argv.slice(routesFlagIdx + 1, process.argv.length);

const outsFlagIdx = process.argv.findIndex(arg => arg === '--outs');
const outs = process.argv.slice(outsFlagIdx + 1, routesFlagIdx);

const document = readFileSync(rootIndexPath, { encoding: 'utf8' });

const win: any = domino.createWindow(document);
declare const global: any;

global.window = win;
global.Node = win.Node;
global.navigator = win.navigator;
global.Event = win.Event;
global.KeyboardEvent = win.Event;
global.MouseEvent = win.Event;
global.Event.prototype = win.Event.prototype;
global.document = win.document;
global.HTMLInputElement = win.HTMLInputElement;
global.HTMLDocument = win.HTMLDocument;

import { AppServerModule } from './app/app.server.module';

const renderProcesses: Array<Promise<any>> = routes.map((url, i) => {
  return renderModule(AppServerModule, { url, document })
    .then((html: string) => writeFileSync(outs[i], `<!-- route: ${url} -->\n${html}`, { encoding: 'utf8' }))
    .catch((err: Error) => {
      console.error(err);
      process.exit(1);
    });
});

Promise.all(renderProcesses)
  .then(() => process.exit());

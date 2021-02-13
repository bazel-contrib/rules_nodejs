import 'zone.js/dist/zone-node';
import 'reflect-metadata';

import {renderModule} from '@angular/platform-server';
import * as domino from 'domino';
import {readFileSync, writeFileSync} from 'fs';

const rootIndexPathFlagIdx = process.argv.findIndex(arg => arg === '--index');
const rootIndexPath = process.argv[rootIndexPathFlagIdx + 1];

const pagesFlagIdx = process.argv.findIndex(arg => arg === '--pages');
const pages = process.argv.slice(pagesFlagIdx + 1, process.argv.length);

const routesFlagIdx = process.argv.findIndex(arg => arg === '--routes');
const routes = process.argv.slice(routesFlagIdx + 1, pagesFlagIdx);

const outsFlagIdx = process.argv.findIndex(arg => arg === '--outs');
const outs = process.argv.slice(outsFlagIdx + 1, routesFlagIdx);

const document = readFileSync(rootIndexPath, {encoding: 'utf8'});

const win: any = domino.createWindow(document);
declare const global: any;

process.env.PAGES_PATHS = pages.join(' ');

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

import {AppServerModule} from './app/app.server.module';

const renderProcesses: Array<Promise<any>> = routes.map((url, i) => {
  return renderModule(AppServerModule, {url, document})
      .then(
          (html: string) =>
              writeFileSync(outs[i], `<!-- route: ${url} -->\n${html}`, {encoding: 'utf8'}))
      .catch((err: Error) => {
        console.error(err);
        process.exit(1);
      });
});

Promise.all(renderProcesses).then(() => process.exit());

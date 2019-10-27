///<reference types="node"/>
import 'zone.js/dist/zone-node';

import {ngExpressEngine} from '@nguniversal/express-engine';
import * as express from 'express';
import {join} from 'path';

// Express server
const app = express();

const PORT = process.env.PORT || 4000;
const DIST_FOLDER = join(process.cwd(), 'src/prodapp');

import {AppServerModule} from './app/app.server.module';

// Our Universal express-engine (found @
// https://github.com/angular/universal/tree/master/modules/express-engine)
app.engine('html', ngExpressEngine({
             bootstrap: AppServerModule,
             providers: [
               // provideModuleMap(LAZY_MODULE_MAP)
             ]
           }));

app.set('view engine', 'html');
app.set('views', DIST_FOLDER);

// Serve static files from /browser
app.get('*.*', express.static(DIST_FOLDER, {maxAge: '1y'}));

// All regular routes use the Universal engine
app.get('*', (req, res) => {
  res.render('index', {req});
});

// Start up the Node server
app.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});

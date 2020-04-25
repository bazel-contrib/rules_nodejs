///<reference types='node'/>
import 'zone.js/dist/zone-node';

import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { join } from 'path';
import * as compression from 'compression';

import { AppServerModule } from './app/app.server.module';

const app = express();
const port = process.env.PORT || 4000;
const DIST_FOLDER = join(process.cwd(), 'src/pwa');

/**
 * text compression for smaller download sizes and thus faster load times
 * without compression: 1.4 MB
 * with compresion: 321 kB
 */
app.use(compression());

app.engine('html', ngExpressEngine({ bootstrap: AppServerModule }) as any);
app.set('view engine', 'html');
app.set('views', DIST_FOLDER);

app.get('*.*', express.static(DIST_FOLDER, { maxAge: '1y' }));
app.get('*', (req, res) => res.render('example/index', { req }));
app.listen(port, () => console.log(`Server listening http://localhost:${port}`));

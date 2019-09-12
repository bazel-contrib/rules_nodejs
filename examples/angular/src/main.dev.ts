/**
 * Used to launch the application under Bazel development mode.
 */
import {platformBrowser} from '@angular/platform-browser';
import {AppModuleNgFactory} from './app/app.module.ngfactory';

platformBrowser().bootstrapModuleFactory(AppModuleNgFactory);

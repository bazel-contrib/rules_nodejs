/**
 * This main entry point is used to launch the app under the
 * @angular-devkit/build-angular, which is the default CLI
 * builder. Note that for AOT, the CLI will magically replace
 * the bootstrap by switching platform-browser-dynamic with
 * platform-browser.
 * This file is completely unused in the Bazel build.
 */
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';

import {AppModule} from './app.module';

platformBrowserDynamic().bootstrapModule(AppModule).catch(err => console.log(err));
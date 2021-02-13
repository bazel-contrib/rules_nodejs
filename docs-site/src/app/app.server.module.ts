import {isPlatformServer} from '@angular/common';
import {HTTP_INTERCEPTORS, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {enableProdMode, Inject, Injectable, NgModule, PLATFORM_ID} from '@angular/core';
import {ServerModule} from '@angular/platform-server';
import {readFileSync} from 'fs';
import {Observable, of} from 'rxjs';

import {AppComponent} from './app.component';
import {AppModule} from './app.module';

const PAGES_PATHS = process.env.PAGES_PATHS.split(' ');

enableProdMode();

@Injectable()
export class HttpToFsFetchInterceptor implements HttpInterceptor {
  constructor(@Inject(PLATFORM_ID) private readonly platformId) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const url = req.url;

    if (!isPlatformServer(this.platformId) || !url.endsWith('.md')) {
      return next.handle(req);
    }

    const path = PAGES_PATHS.find(p => p.endsWith(req.url));
    const body = readFileSync(path, {encoding: 'utf8'});

    return of(new HttpResponse({body}));
  }
}

@NgModule({
  imports: [AppModule, ServerModule],
  bootstrap: [AppComponent],
  providers: [{provide: HTTP_INTERCEPTORS, multi: true, useClass: HttpToFsFetchInterceptor}]
})
export class AppServerModule {
}

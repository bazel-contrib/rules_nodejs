import {CommonModule} from '@angular/common';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import {APP_INITIALIZER, NgModule, SecurityContext} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {MarkdownModule} from 'ngx-markdown';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {DocRendererComponent} from './doc-renderer/doc-renderer.component';
import {DocsService} from './docs.service';
import {NotFoundComponent} from './not-found/not-found.component';
import {SearchComponent} from './search/search.component';
import {SidenavComponent} from './sidenav/sidenav.component';
import {TitleBarComponent} from './title-bar/title-bar.component';
import {TocComponent} from './toc/toc.component';

export const DocsServiceInitializer = (docs: DocsService) => () => docs.init();

@NgModule({
  declarations: [
    AppComponent, TitleBarComponent, SidenavComponent, DocRendererComponent, NotFoundComponent,
    TocComponent, SearchComponent
  ],
  imports: [
    CommonModule, BrowserModule.withServerTransition({appId: 'docs'}), HttpClientModule,
    AppRoutingModule, MarkdownModule.forRoot({loader: HttpClient, sanitize: SecurityContext.NONE})
  ],
  providers: [
    {provide: APP_INITIALIZER, multi: true, deps: [DocsService], useFactory: DocsServiceInitializer}
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}

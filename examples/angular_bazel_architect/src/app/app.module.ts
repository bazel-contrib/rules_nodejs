import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FrontendLibModule} from 'frontend-lib';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FrontendLibModule,
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule {}

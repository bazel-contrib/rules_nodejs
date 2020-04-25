
import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {StoreModule} from '@ngrx/store';
import { ServiceWorkerModule } from '@angular/service-worker';

import {MaterialModule} from '../shared/material/material.module';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {HomeModule} from './home/home';
import {todoReducer} from './todos/reducers/reducers';

@NgModule({
  declarations: [AppComponent],
  imports: [
    AppRoutingModule, BrowserModule, BrowserAnimationsModule, MaterialModule, HomeModule,
    StoreModule.forRoot({todoReducer}),
    BrowserModule.withServerTransition({ appId: 'angular-bazel-example' }),
    ServiceWorkerModule.register('ngsw-worker.js')
  ],
  exports: [AppComponent],
  bootstrap: [AppComponent],
})
export class AppModule {
}

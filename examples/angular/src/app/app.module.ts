
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
import { ServiceWorkerService } from './service-worker.service';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    ServiceWorkerModule.register('ngsw-worker.js'),
  
    AppRoutingModule,
    MaterialModule,
    HomeModule,
    StoreModule.forRoot({todoReducer}),
  ],
  providers:[ServiceWorkerService],
  exports: [AppComponent],
  bootstrap: [AppComponent],
})
export class AppModule {
}

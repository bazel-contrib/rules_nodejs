
import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {StoreModule} from '@ngrx/store';

import {MaterialModule} from '../shared/material/material.module';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {HomeModule} from './home/home';
import {todoReducer} from './todos/reducers/reducers';

@NgModule({
  declarations: [AppComponent],
  imports: [
    AppRoutingModule, BrowserModule, BrowserAnimationsModule, MaterialModule, HomeModule,
    StoreModule.forRoot({todoReducer})
  ],
  exports: [AppComponent],
  bootstrap: [AppComponent],
})
export class AppModule {
}

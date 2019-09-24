
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
    // Runtime throws with the below error when this is enabled
    // Uncaught Error: Angular JIT compilation failed: '@angular/compiler' not loaded!
    //   - JIT compilation is discouraged for production use-cases! Consider AOT mode instead.
    //   - Did you bootstrap using '@angular/platform-browser-dynamic' or '@angular/platform-server'?
    //   - Alternatively provide the compiler with 'import "@angular/compiler";' before bootstrapping.
    // StoreModule.forRoot({todoReducer})
  ],
  exports: [AppComponent],
  bootstrap: [AppComponent],
})
export class AppModule {
}

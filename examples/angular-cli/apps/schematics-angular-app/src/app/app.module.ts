import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {SharedBuildableLibModule} from 'examples_angular_cli/shared-buildable-lib';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule, SharedBuildableLibModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MaterialModule} from '../material/material.module';

import {HelloWorldComponent} from './hello-world.component';

@NgModule({
  declarations: [HelloWorldComponent],
  imports: [
    FormsModule,
    MaterialModule,
  ],
  exports: [HelloWorldComponent],
})
export class HelloWorldModule {}

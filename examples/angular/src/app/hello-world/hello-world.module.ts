import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterModule} from '@angular/router';
import {MaterialModule} from '../../shared/material/material.module';

import {HelloWorldComponent} from './hello-world.component';

@NgModule({
  declarations: [HelloWorldComponent],
  imports: [
    FormsModule, RouterModule, MaterialModule,
    RouterModule.forChild([{path: '', component: HelloWorldComponent}])
  ],
  exports: [HelloWorldComponent],
})
export class HelloWorldModule {
}

import {NgModule} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatListModule} from '@angular/material/list';
import {MatToolbarModule} from '@angular/material/toolbar';

const matModules = [
  MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatListModule,
  MatToolbarModule
];

@NgModule({
  imports: matModules,
  exports: matModules,
})
export class MaterialModule {}
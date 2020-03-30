import {Component, Input, NgModule} from '@angular/core';

@Component({
  selector: 'big-word',
  template: '<h1>{{ word }}</h1>',
})
export class BigWordComponent { @Input() public word?: string; }

@NgModule({
  declarations: [BigWordComponent],
  exports: [BigWordComponent],
})
export class BigWordModule {}
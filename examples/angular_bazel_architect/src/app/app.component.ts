import {Component} from '@angular/core';
import {MyComponent} from '@libs/ng-lib';
import {stringCompare} from '@libs/ts-lib';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';

  equal: boolean;

  constructor() {
    this.title = stringCompare('1', '2') ? 'frontend' : 'frontend';
    console.log(new MyComponent())
  }
}

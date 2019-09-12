import {Component, NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';

@Component({
  selector: 'home',
  templateUrl: './home.html',
})
export class Home {
}

@NgModule({
  declarations: [Home],
  imports: [
    RouterModule.forChild([{path: '', component: Home}]),
  ],
})
export class HomeModule {
}
import {Component, NgModule} from '@angular/core';

@Component({
  selector: 'hello-world',
  templateUrl: 'hello-world.component.html',
  styleUrls: ['./hello-world.component.css']
})
export class HelloWorldComponent { name: string = 'World'; }

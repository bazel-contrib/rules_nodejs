import {format} from 'date-fns';
import {of} from 'rxjs';
import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

function appendText(text: string, className: string) {
  const el: HTMLDivElement = document.createElement('div');
  el.innerText = text;
  el.className = className;
  document.body.appendChild(el);
}

function testDateFns() {
  const date: string = format(new Date(2019, 4, 7), 'MMMM D, YYYY');
  appendText(`Hello, TypeScript today is ${date}`, 'ts1');
}


@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  firstName: string;
  @Column()
  lastName: string;
  @Column()
  isActive: boolean;
}

function testBrowserEntryPoint() {
  // this script will throw if the browser entryPoint in typeorm wasn't resolved correctly
  const user = new User();
  user.firstName = 'foo';
  appendText(`firstname: ${user.firstName}`, 'entrypoint-browser');
}

function testModuleEntryPoint() {
  // rxjs uses the module entrypoint to resolve to some import/export
  of('rxjs works with modules!').subscribe(value => appendText(String(value), 'entrypoint-module'))
}

testDateFns();
testBrowserEntryPoint();
testModuleEntryPoint();
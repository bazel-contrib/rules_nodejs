import {fum} from 'fumlib';

import {name} from './bar';

console.log(`Hello, ${name} in ${fum}`);

// Test for sequences = false
export class A {
  a() {
    return document.a;
  }
}
function inline_me() {
  return 'abc';
}
console.error(new A().a(), inline_me());

import {name} from './bar';
import {fum} from 'fumlib';

console.log(`Hello, ${name} in ${fum}`);

// Test for sequences = false
class A {
  a() { return document.a; }
}
console.error(new A().a());

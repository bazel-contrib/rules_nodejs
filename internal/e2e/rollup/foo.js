import node_rollup_npm from 'node_rollup_npm';
import {fum} from 'fumlib';

import {name} from './bar';

console.log(`Hello, ${name} in ${fum}, is your npm ${node_rollup_npm}?`);

// Test for sequences = false
class A {
  a() {
    return document.a;
  }
}
function inline_me() {
  return 'abc';
}
console.error(new A().a(), inline_me());

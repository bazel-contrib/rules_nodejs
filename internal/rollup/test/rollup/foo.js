import {fum} from 'fumlib';
import hello from 'hello';
import {thing} from 'some_global_var';

import {name} from './bar';

console.log(`${hello}, ${name} in ${fum}`);

// Tests for @PURE annotations
/*@__PURE__*/
console.log('side-effect');

class Impure {
  constructor() {
    console.log('side-effect')
  }
}

/*@__PURE__*/ new Impure();

// Test for sequences = false
export class A {
  a() {
    return document.a;
  }
}
function inline_me() {
  return 'abc';
}
console.error(new A().a(), inline_me(), thing, ngDevMode, ngI18nClosureMode);
ngDevMode && console.log('ngDevMode is truthy');
ngI18nClosureMode && console.log('ngI18nClosureMode is truthy');

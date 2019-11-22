import far_a from '@far/a';
import far_a_b_c from '@far/a/b/c';
import {foo} from '@foo/lib';
import {foo as foo_a} from '@foo/lib/a';
import {foo as foo_a_a_a} from '@foo/lib/a/a/a';
import {fum} from 'fumlib';
import hello from 'hello';
import {thing} from 'some_global_var';

import {name} from './bar';
import {json_key} from './some.json';

console.log(
    `${hello}, ${name} in ${fum} ${foo} ${foo_a} ${foo_a_a_a} ${far_a} ${far_a_b_c} ${json_key}`);

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
console.error(new A().a(), inline_me(), thing);

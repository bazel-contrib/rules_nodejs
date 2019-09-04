import {fn as fn1} from './dep1.js';
import {fn as fn2} from './dep2.js';
import {dynamic} from './dynamic.js';

export function test() {
  return fn1() + ',' + fn2();
}

export function test2() {
  return dynamic();
}

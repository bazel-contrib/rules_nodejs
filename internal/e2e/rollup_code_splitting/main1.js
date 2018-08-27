import {fn as fn1} from './dep1.js';
import {fn as fn2} from './dep2.js';

export default class Main1 {
  test() {
    return fn1() + ',' + fn2();
  }
}
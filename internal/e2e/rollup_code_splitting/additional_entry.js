import {fn as fn2} from './dep2.js';
import {fn as fn3} from './dep3.js';

export default class Additional_entry {
  test() {
    return fn3() + ',' + fn2();
  }
}
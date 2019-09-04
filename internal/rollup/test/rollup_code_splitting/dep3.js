import {fn as lib1fn} from './lib1.js';

export function fn() {
  return lib1fn() + ',dep3 fn';
}

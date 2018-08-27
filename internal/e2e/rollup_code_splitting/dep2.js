import {fn as lib2fn} from './lib2.js';

export function fn() {
  return lib2fn() + ',dep2 fn';
}
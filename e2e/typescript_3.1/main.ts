import {sayFive} from './lib';

console.log(sayFive());

export function test() {
  return `test ${sayFive()}`;
}
import {sayDate} from './lib';

console.log(sayDate());

export function test() {
  return `test ${sayDate()}`;
}
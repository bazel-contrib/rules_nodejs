import * as os from 'os';

console.log('Platform: ' + os.platform());
console.log('Architecture: ' + os.arch());

export function test() {
  return 'test';
}
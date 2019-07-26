try {
  require('minimist');
  console.error('should fail to resolve minimist');
  process.exitCode = 1;
} catch {
}


// should resolve tmp
require('tmp');

const testA = require('@gregmagolan/test-a');
if (testA !== 'test-a-0.0.2') {
  console.error('should resolve @gregmagolan/test-a to version 0.0.2 but was', testA);
  process.exitCode = 1;
}

const testB = require('@gregmagolan/test-b');
if (testB !== 'test-b-0.0.2/test-a-0.0.1') {
  console.error(
      'should resolve @gregmagolan/test-b to version 0.0.2 with a @gregmagolan/test-a dependency of 0.0.1 but was',
      testB);
  process.exitCode = 1;
}

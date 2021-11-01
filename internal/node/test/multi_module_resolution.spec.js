// test node npm resolution with multiple roots
try {
  require('rxjs');
} catch (err) {
  console.error('should resolve to one of the rxjs modules by default');
  process.exitCode = 1;
}

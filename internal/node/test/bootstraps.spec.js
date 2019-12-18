if (global.bootstrapped !== 2) {
  console.error('should run 2 boostrap scripts');
  process.exitCode = 1;
}

if (global.last_bootstrap !== 'bootstrap2') {
  console.error('should run bootstrap scripts in order');
  process.exitCode = 1;
}

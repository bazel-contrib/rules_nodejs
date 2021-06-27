const semver = require('semver')
if (!semver.patched) {
  console.error('Expected semver to be patched');
  process.exitCode = 1;
}

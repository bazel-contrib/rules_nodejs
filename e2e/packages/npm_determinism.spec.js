const fs = require('fs');
const path = require('path');

const packageJsonPath = require.resolve('jsesc').replace('jsesc.js', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));

const packageJsonPath2 = packageJsonPath.replace(
    '/e2e_packages_npm_install_duplicate_for_determinism_testing/', '/e2e_packages_npm_install/');
const packageJson2 = JSON.parse(fs.readFileSync(packageJsonPath2));

try {
  require.resolve('tmp');
  console.error(
      'expected tmp to not be installed by npm as --production was passed via args in npm_install');
  process.exitCode = 1;
} catch (_) {
}

if (packageJsonPath === packageJsonPath2) {
  console.error('expected different json paths');
  process.exitCode = 1;
}
if (JSON.stringify(packageJson) !== JSON.stringify(packageJson2)) {
  console.error(
      'jsesc package.json files from two different yarn_install runs should have the same contents');
  process.exitCode = 1;
}

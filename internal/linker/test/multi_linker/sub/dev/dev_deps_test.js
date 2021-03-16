const assert = require('assert')

function pkgVersion(pkg) {
  return require(require.resolve(`${pkg}/package.json`)).version
}

assert.equal(
    pkgVersion('semver'), '1.0.3',
    `expected local semver version '${pkgVersion('semver')}' to match sub/package.json version`)

assert.equal(
    pkgVersion('smallest'), '1.0.1',
    `expected local smallest version '${pkgVersion('smallest')}' to match sub/package.json version`)
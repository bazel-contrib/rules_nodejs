const assert = require('assert')
const isWindows = /^win/i.test(process.platform);

function pkgVersion(pkg) {
  return require(require.resolve(`${pkg}/package.json`)).version
}

assert.equal(
    pkgVersion('semver'), '1.0.3',
    `expected local semver version '${pkgVersion('semver')}' to match sub/package.json version`)

if (!isWindows) {
  // We can't assert the following on Windows since it doesn't run in a sandbox
  try {
    const p = require.resolve('smallest');
    assert.fail(`require \'smallest\' should have thrown but resolved to ${p} instead`)
  } catch (e) {
    assert.equal(e.name, 'Error', `Should have thrown Error but threw ${e}`)
    assert.equal(e.code, 'MODULE_NOT_FOUND', 'Should have thrown MODULE_NOT_FOUND')
  }
}

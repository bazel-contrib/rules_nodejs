const assert = require('assert')
const semver = require('semver')
const isWindows = /^win/i.test(process.platform);

function pkgVersion(pkg) {
  return require(require.resolve(`${pkg}/package.json`)).version
}

assert.equal(
    pkgVersion('semver'), '1.0.5',
    'expected pkgVersion("semver") to match test_b/package.json version')

if (!isWindows) {
  // We can't assert the following on Windows since it doesn't run in a sandbox
  try {
    require('@test_multi_linker/lib-d')
    assert.fail('require \'@test_multi_linker/lib-d\' should have thrown')
  } catch (e) {
    assert.equal(e.name, 'Error', 'Should have thrown Error')
    assert.equal(e.code, 'MODULE_NOT_FOUND', 'Should have thrown MODULE_NOT_FOUND')
  }

  // We can't assert the following on Windows since it doesn't run in a sandbox
  try {
    require('@test_multi_linker/lib-c')
    assert.fail('require \'@test_multi_linker/lib-c\' should have thrown')
  } catch (e) {
    assert.equal(e.name, 'Error', 'Should have thrown Error')
    assert.equal(e.code, 'MODULE_NOT_FOUND', 'Should have thrown MODULE_NOT_FOUND')
  }
}

const libb = require('@test_multi_linker/lib-b')
assert.equal(
    libb.whichSemver(), '1.0.2',
    'expected libb.whichSemver() to be its transitive lib_b/package.json version')

if (!isWindows) {
  // We can't assert the following on Windows since it doesn't run in a sandbox
  const liba = require('@test_multi_linker/lib-a')
  assert.ok(
      semver.gte(liba.whichSemver(), '5.0.0'),
      `expected liba.whichSemver() ${liba.whichSemver()} to be the root @npm version >= 5.0.0`)
}

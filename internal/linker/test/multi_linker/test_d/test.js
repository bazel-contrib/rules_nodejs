const assert = require('assert')
const semver = require('semver')
const isWindows = /^win/i.test(process.platform);

function pkgVersion(pkg) {
  return require(require.resolve(`${pkg}/package.json`)).version
}

assert.equal(
    pkgVersion('semver'), '1.0.7',
    'expected pkgVersion("semver") to match test_d/package.json version')

if (!isWindows) {
  // We can't assert the following on Windows since it doesn't run in a sandbox
  const libd = require('@test_multi_linker/lib-d')
  assert.ok(
      semver.gte(libd.whichSemver(), '5.0.0'),
      `expected libd.whichSemver() ${libd.whichSemver()} to be the root @npm version >= 5.0.0`)

  // We can't assert the following on Windows since it doesn't run in a sandbox
  const libd2 = require('@test_multi_linker/lib-d2')
  assert.ok(
      semver.gte(libd2.whichSemver(), '5.0.0'),
      `expected libd2.whichSemver() ${libd2.whichSemver()} to be the root @npm version >= 5.0.0`)
}

const libc = require('@test_multi_linker/lib-c')
assert.equal(
    libc.whichSemver(), '1.0.8',
    'expected libc.whichSemver() to be its transitive lib_c/package.json version')

const libc2 = require('@test_multi_linker/lib-c2')
assert.equal(
    libc2.whichSemver(), '1.0.8',
    'expected libc2.whichSemver() to be its transitive lib_c/package.json version')

const libb = require('@test_multi_linker/lib-b')
assert.equal(
    libb.whichSemver(), '1.0.2',
    'expected libb.whichSemver() to be its transitive lib_b/package.json version')

const libb2 = require('@test_multi_linker/lib-b2')
assert.equal(
    libb2.whichSemver(), '1.0.2',
    'expected libb2.whichSemver() to be its transitive lib_b/package.json version')

if (!isWindows) {
  // We can't assert the following on Windows since it doesn't run in a sandbox
  const liba = require('@test_multi_linker/lib-a')
  assert.ok(
      semver.gte(liba.whichSemver(), '5.0.0'),
      `expected liba.whichSemver() ${liba.whichSemver()} to be the root @npm version >= 5.0.0`)

  // We can't assert the following on Windows since it doesn't run in a sandbox
  const liba2 = require('@test_multi_linker/lib-a2')
  assert.ok(
      semver.gte(liba2.whichSemver(), '5.0.0'),
      `expected liba2.whichSemver() ${liba2.whichSemver()} to be the root @npm version >= 5.0.0`)
}
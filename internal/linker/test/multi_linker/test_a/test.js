const assert = require('assert')
const isWindows = /^win/i.test(process.platform);

function pkgVersion(pkg) {
  return require(require.resolve(`${pkg}/package.json`)).version
}

if (!isWindows) {
  // We can't assert the following on Windows since it doesn't run in a sandbox
  assert.equal(
      pkgVersion('semver'), '1.0.4',
      'expected pkgVersion("semver") to match test_a/package.json version')

  // We can't assert the following on Windows since it doesn't run in a sandbox
  const libd = require('@test_multi_linker/lib-d')
  assert.equal(
      libd.whichSemver(), '1.0.4',
      `expected libd.whichSemver() to be test_a/package.json version but got ${
          libd.whichSemver()} instead`)

  // We can't assert the following on Windows since it doesn't run in a sandbox
  const libd2 = require('@test_multi_linker/lib-d2')
  assert.equal(
      libd2.whichSemver(), '1.0.4',
      `expected libd.whichSemver() to be test_a/package.json version but got ${
          libd2.whichSemver()} instead`)
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
  assert.equal(
      liba.whichSemver(), '1.0.4',
      `expected liba.whichSemver() to be test_a/package.json version but got ${
          liba.whichSemver()} instead`)

  // We can't assert the following on Windows since it doesn't run in a sandbox
  const liba2 = require('@test_multi_linker/lib-a2')
  assert.equal(
      liba2.whichSemver(), '1.0.4',
      `expected liba.whichSemver() to be test_a/package.json version but got ${
          liba2.whichSemver()} instead`)
}
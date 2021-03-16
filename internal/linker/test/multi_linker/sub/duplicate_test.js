const assert = require('assert')

function pkgVersion(pkg) {
  return require(require.resolve(`${pkg}/package.json`)).version
}

assert.equal(
    pkgVersion('semver'), '1.0.3',
    `expected local semver version '${pkgVersion('semver')}' to match sub/package.json version`)

const libd = require('@test_multi_linker/lib-d')
assert.equal(
    libd.whichSemver(), '1.0.3',
    `expected libd.whichSemver() to be sub/package.json version but got ${
        libd.whichSemver()} instead`)

const libd2 = require('@test_multi_linker/lib-d2')
assert.equal(
    libd2.whichSemver(), '1.0.3',
    `expected libd2.whichSemver() to be sub/package.json version but got ${
        libd2.whichSemver()} instead`)

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
    'expected libb.whichSemver() to be its transitive lib_b/package.json version')

const liba = require('@test_multi_linker/lib-a')
assert.equal(
    liba.whichSemver(), '1.0.3',
    `expected liba.whichSemver() to be sub/package.json version but got ${
        liba.whichSemver()} instead`)

const liba2 = require('@test_multi_linker/lib-a2')
assert.equal(
    liba2.whichSemver(), '1.0.3',
    `expected liba.whichSemver() to be sub/package.json version but got ${
        liba2.whichSemver()} instead`)

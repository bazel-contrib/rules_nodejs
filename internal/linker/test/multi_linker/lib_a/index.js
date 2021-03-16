
module.exports = {
  whichSemver: function() {
    return require(require.resolve('semver/package.json')).version;
  }
}

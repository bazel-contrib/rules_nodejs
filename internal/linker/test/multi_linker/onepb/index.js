function semverVersion() {
  const semverVersion = require(require.resolve('semver/package.json')).version;
  return semverVersion;
}

function semver() {
  return require('semver');
}

module.exports = {
  semverVersion,
  semver
}

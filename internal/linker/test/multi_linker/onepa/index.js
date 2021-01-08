function semverVersion() {
  const semverVersion = require(require.resolve('semver/package.json')).version;
  return semverVersion;
}

module.exports = {semverVersion}

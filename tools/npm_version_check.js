#!/usr/bin/env node
const pkg = require('./package.json');
const pkgVersion = pkg.version;
const rules_nodejsVersion = process.env['BUILD_BAZEL_RULES_NODEJS_VERSION'];

const getMajor = versionString => versionString.split('.')[0];

// special case the version 0.0.0 so that we don't have to stamp builds
// for dev and testing
if (pkgVersion !== '0.0.0' && getMajor(pkgVersion) !== getMajor(rules_nodejsVersion)) {
  throw new Error(`Expected package major version to equal @build_bazel_rules_nodejs major version
    ${pkg.name} - ${pkgVersion}  
    @build_bazel_rules_nodejs - ${rules_nodejsVersion}`)
}
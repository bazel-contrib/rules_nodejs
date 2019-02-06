// Called from "version" npm script when running `npm version`
// during release process. This script updates the version
// in package.bzl to match that of package.json.
const fs = require('fs');
const shell = require('shelljs');
const version = require('./package.json').version;
const artifact = 'bazel-bin/release.tar.gz';
const hash = require('crypto').createHash('sha256');
// TODO(alexeagle): consider streaming the bytes into the hash function, if this consumes too much
// RAM
const sha256 = hash.update(fs.readFileSync(artifact)).digest('hex');

shell.sed('-i', 'VERSION \= \"[0-9\.]*\"', `VERSION = "${version}"`, 'package.bzl');
shell.sed(
    '-i', 'download/[0-9\.]*/rules_nodejs-[0-9\.]*.tar.gz',
    `download/${version}/rules_nodejs-${version}.tar.gz`, 'README.md');
shell.sed('-i', 'sha256 = \"[0-9a-f]+\"', `sha256 = "${sha256}"`, 'README.md');
shell.cp(artifact, `rules_nodejs-${version}.tar.gz`);

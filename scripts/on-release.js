// Called from "version" npm script when running `npm version`
// during release process. This script updates the README.md file to point to the release.
// It also copies the release file to a filename matching the one we want to publish to GitHub.
const fs = require('fs');
const shell = require('shelljs');
const version = require('../package.json').version;
const artifact = 'bazel-bin/release.tar.gz';
const hash = require('crypto').createHash('sha256');
// TODO(alexeagle): consider streaming the bytes into the hash function, if this consumes too much
// RAM
const sha256 = hash.update(fs.readFileSync(artifact)).digest('hex');

for (const f in ['README.md', 'packages/create/index.js']) {
  shell.sed(
      '-i', 'download/[0-9\.]*/rules_nodejs-[0-9\.]*.tar.gz',
      `download/${version}/rules_nodejs-${version}.tar.gz`, f);
  shell.sed('-i', 'sha256 = \"[0-9a-f]+\"', `sha256 = "${sha256}"`, f);
}
shell.cp(artifact, `rules_nodejs-${version}.tar.gz`);

// Called from "version" npm script when running `npm version`
// during release process. This script updates the docs to point to the release.
// It also copies the release file to a filename matching the one we want to publish to GitHub.
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const version = require('../package.json').version;
const artifact = 'dist/bin/release.tar.gz';
const hash = require('crypto').createHash('sha256');
// TODO(alexeagle): consider streaming the bytes into the hash function, if this consumes too much
// RAM
const sha256 = hash.update(fs.readFileSync(artifact)).digest('hex');

for (const f of ['docs/install.md', 'packages/create/index.js']) {
  shell.sed(
      '-i', 'download/[0-9\.]*(-rc.[0-9]+)?/rules_nodejs-[0-9\.]*(-rc.[0-9]+)?.tar.gz',
      `download/${version}/rules_nodejs-${version}.tar.gz`, f);
  shell.sed('-i', 'sha256 = \"[0-9a-f]+\"', `sha256 = "${sha256}"`, f);
}
shell.cp('-f', artifact, `rules_nodejs-${version}.tar.gz`);

/**
 * Returns an array of all WORKSPACE the files under a directory.
 */
function findFiles(regex, dir) {
  return fs.readdirSync(dir).reduce((files, file) => {
    const fullPath = path.posix.join(dir, file);
    const isDirectory = fs.statSync(fullPath).isDirectory();
    if (isDirectory) {
      return files.concat(findFiles(regex, fullPath));
    } else if (regex.test(file)) {
      return files.concat(fullPath);
    } else {
      return files;
    }
  }, []);
}

const workspaceFiles = [
  ...findFiles(/^WORKSPACE$/, 'e2e'),
  ...findFiles(/^WORKSPACE$/, 'examples'),
];

for (const f of workspaceFiles) {
  let workspaceContents = fs.readFileSync(f, {encoding: 'utf-8'});
  const regex = new RegExp(`http_archive\\(\\s*name\\s*\\=\\s*"build_bazel_rules_nodejs"[^)]+`);
  const replacement = `http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "${sha256}",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/${version}/rules_nodejs-${
      version}.tar.gz"],
`;
  workspaceContents = workspaceContents.replace(regex, replacement);
  fs.writeFileSync(f, workspaceContents);
}

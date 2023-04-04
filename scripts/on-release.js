// Called from "version" npm script when running `npm version`
// during release process. This script updates the docs to point to the release.
// It also copies the release file to a filename matching the one we want to publish to GitHub.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const version = require('../package.json').version;

const starlarkModule = process.argv[2];
if (starlarkModule !== 'build_bazel_rules_nodejs' && starlarkModule != 'rules_nodejs') {
  throw new Error("first argument must be module to release (build_bazel_rules_nodejs or rules_nodejs)")
}
const artifactSuffix = starlarkModule == 'rules_nodejs' ? '-core' : ''
const artifact = `dist/bin/release${artifactSuffix}.tar.gz`;

function computeSha256(path) {
  const hash = crypto.createHash('sha256');
  // TODO(alexeagle): consider streaming the bytes into the hash function, if this consumes too much
  // RAM
  return hash.update(fs.readFileSync(path)).digest('hex');
}
const sha256 = computeSha256(artifact);

if (starlarkModule == 'build_bazel_rules_nodejs') {
  for (const f of ['docs/install.md']) {
    shell.sed(
        '-i', 'download/[0-9\.]*(-(beta|rc).[0-9]+)?/rules_nodejs-[0-9\.]*(-(beta|rc).[0-9]+)?.tar.gz',
        `download/${version}/rules_nodejs-${version}.tar.gz`, f);
    shell.sed('-i', 'sha256 = \"[0-9a-f]+\"', `sha256 = "${sha256}"`, f);
  }
} else {
  shell.sed(
    '-i', 'download/[0-9\.]*(-(beta|rc).[0-9]+)?/rules_nodejs-core-[0-9\.]*(-(beta|rc).[0-9]+)?.tar.gz',
    `download/${version}/rules_nodejs-core-${version}.tar.gz`, 'repositories.bzl')
  
  shell.sed('-i', 'core_sha = \"[0-9a-f]+\"', `core_sha = "${sha256}"`, 'repositories.bzl');
}

shell.cp('-f', artifact, `rules_nodejs${artifactSuffix}-${version}.tar.gz`);

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
  
  const regex = new RegExp(`http_archive\\(\\s*name\\s*\\=\\s*"${starlarkModule}"[^)]+`);
  const replacement = `http_archive(
    name = "${starlarkModule}",
    sha256 = "${sha256}",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/${version}/rules_nodejs${artifactSuffix}-${
        version}.tar.gz"],
`;
  workspaceContents = workspaceContents.replace(regex, replacement);
  fs.writeFileSync(f, workspaceContents);
}

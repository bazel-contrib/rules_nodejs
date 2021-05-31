const { readFileSync } = require('fs');
const md = process.argv[2];
const content = readFileSync(md, {encoding: 'utf8'});

// replace the //packages/foo from the docs with references to @npm//@bazel/foo
// @npm is not the required name, but it seems to be the common case
// this reflects the similar transformation made when publishing the packages to npm
// via pkg_npm defined in //tools:defaults.bzl
const out = content.replace(/(?:@.*)*?\/\/packages\/([^/:"\s]*)/g, (str, pkg) => {
  const parts = pkg.split('/');
  return `@npm//@bazel/${parts[parts.length - 1]}`;
});

// write out to stdout, this script is run as part of a genrule that redirects the output the to expected file
process.stdout.write(out);

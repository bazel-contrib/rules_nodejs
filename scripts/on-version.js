// Called from "version" npm script when running `npm version`
// during release process. This script updates the version
// in defs.bzl to match that of package.json.
const shell = require('shelljs');
const version = require('../package.json').version;

shell.sed('-i', 'VERSION \= \"[0-9\.]*\"', `VERSION = "${version}"`, 'defs.bzl');
shell.sed(
    '-i', '\/releases\/download\/[0-9\.]*\/rules_nodejs-[0-9\.]*.tar.gz',
    `/releases/download/${version}/rules_nodejs-${version}.tar.gz`, 'README.md');

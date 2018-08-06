// Called from "version" npm script when running `npm version`
// during release process. This script updates the version
// in package.bzl to match that of package.json.
const shell = require('shelljs');
const version = require('./package.json').version;
shell.sed('-i', 'VERSION \= \"[0-9\.]*\"', `VERSION = "${version}"`, 'package.bzl')

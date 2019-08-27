#!/usr/bin/env node

// Pass-through require, ensures that the nodejs_binary will load the version of terser
// from @bazel/terser package.json, not some other version the user depends on.
require('terser/bin/uglifyjs');

// TODO: add support for minifying multiple files (eg. a TreeArtifact) in a single execution
// Under Node 12 it should use the worker threads API to saturate all local cores
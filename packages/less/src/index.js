#!/usr/bin/env node

// Pass-through require, ensures that the nodejs_binary will load the version of less
// from @bazel/less package.json, not some other version the user depends on.
require('less/bin/lessc');

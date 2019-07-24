#!/usr/bin/env node

// Pass-through require, ensures that the nodejs_binary will load the version of stylus
// from @bazel/stylus package.json, not some other version the user depends on.
require('stylus/bin/stylus');

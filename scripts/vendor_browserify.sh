#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

echo "Compiling browserify with ncc"
./node_modules/.bin/ncc build node_modules/browserify/bin/cmd.js -o third_party/github.com/browserify/browserify

echo "Copy LICENSE"
cp -f ./node_modules/browserify/LICENSE ./third_party/github.com/browserify/browserify

echo "Minifying browserify with tserver"
./node_modules/.bin/terser --compress --mangle --comments '/(^!|@license|@preserve|Copyright)/' -- third_party/github.com/browserify/browserify/index.js > third_party/github.com/browserify/browserify/index.min.js


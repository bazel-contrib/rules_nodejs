# Vendored browserify

This directory contains the [browserify](https://github.com/browserify/browserify) npm package compiled into a single file by [@zeit/ncc](https://github.com/zeit/ncc) and minified by [terser](https://github.com/terser-js/terser).

The script that generates this distribution is under `/scripts/vendor_browserify.sh`.

Licensing comments are preserved in the terser step with the following comments filter `--comments '/(^!|@license|@preserve)/'`.

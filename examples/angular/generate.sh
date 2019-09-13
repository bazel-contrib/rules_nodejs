#!/bin/bash
set -e

yarn
yarn generate:clean
yarn generate

FN=src/app/modules.bzl
echo "APP_MODULES = [" >$FN
find src/app -mindepth 2 -maxdepth 2 -name BUILD.bazel -printf '    "//%h",\n' >>$FN
echo "]" >>$FN

# Verify it builds
yarn run build

# TODO push to other Git repo

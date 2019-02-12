#!/usr/bin/env bash
# Used with Bazel's stamping feature
echo BUILD_SCM_VERSION $(git describe --abbrev=7 --tags HEAD)

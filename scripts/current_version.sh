#!/usr/bin/env bash
# Used with Bazel's stamping feature
# TODO: remove this one as part of #2158
echo BUILD_SCM_VERSION $(git describe --abbrev=7 --tags HEAD)
echo STABLE_BUILD_SCM_VERSION $(git describe --abbrev=7 --tags HEAD)

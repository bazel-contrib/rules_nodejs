#!/usr/bin/env bash
echo BUILD_SCM_VERSION $(git describe --abbrev=7 --tags HEAD)

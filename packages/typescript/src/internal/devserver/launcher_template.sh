#!/usr/bin/env bash

# Copyright 2018 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -e

# --- begin runfiles.bash initialization ---
# Source the runfiles library:
# https://github.com/bazelbuild/bazel/blob/master/tools/bash/runfiles/runfiles.bash
# The runfiles library defines rlocation, which is a platform independent function
# used to lookup the runfiles locations. This code snippet is needed at the top
# of scripts that use rlocation to lookup the location of runfiles.bash and source it
if [[ ! -d "${RUNFILES_DIR:-/dev/null}" && ! -f "${RUNFILES_MANIFEST_FILE:-/dev/null}" ]]; then
    if [[ -f "$0.runfiles_manifest" ]]; then
      export RUNFILES_MANIFEST_FILE="$0.runfiles_manifest"
    elif [[ -f "$0.runfiles/MANIFEST" ]]; then
      export RUNFILES_MANIFEST_FILE="$0.runfiles/MANIFEST"
    elif [[ -f "$0.runfiles/bazel_tools/tools/bash/runfiles/runfiles.bash" ]]; then
      export RUNFILES_DIR="$0.runfiles"
    fi
fi
if [[ -f "${RUNFILES_DIR:-/dev/null}/bazel_tools/tools/bash/runfiles/runfiles.bash" ]]; then
  source "${RUNFILES_DIR}/bazel_tools/tools/bash/runfiles/runfiles.bash"
elif [[ -f "${RUNFILES_MANIFEST_FILE:-/dev/null}" ]]; then
  source "$(grep -m1 "^bazel_tools/tools/bash/runfiles/runfiles.bash " \
            "$RUNFILES_MANIFEST_FILE" | cut -d ' ' -f 2-)"
else
  echo >&2 "ERROR: cannot find @bazel_tools//tools/bash/runfiles:runfiles.bash"
  exit 1
fi
# --- end runfiles.bash initialization ---

# Check environment for which node path to use
unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     machine=linux ;;
    Darwin*)    machine=darwin ;;
    CYGWIN*)    machine=windows ;;
    MINGW*)     machine=windows ;;
    MSYS_NT*)   machine=windows ;;
    *)          machine=linux
                printf "\nUnrecongized uname '${unameOut}'; defaulting to use node for linux.\n" >&2
                printf "Please file an issue to https://github.com/bazelbuild/rules_nodejs/issues if \n" >&2
                printf "you would like to add your platform to the supported ts_devserver platforms.\n\n" >&2
                ;;
esac

case "${machine}" in
  # The following paths must match up with @npm_bazel_typescript//devserver binaries
  darwin) readonly platform_main_manifest="npm_bazel_typescript/devserver/devserver-darwin_x64" ;;
  windows) readonly platform_main_manifest="npm_bazel_typescript/devserver/devserver-windows_x64.exe" ;;
  *) readonly platform_main_manifest="npm_bazel_typescript/devserver/devserver-linux_x64" ;;
esac

readonly platform_main=$(rlocation "${platform_main_manifest}")

if [ -f "${platform_main}" ]; then
  readonly main=${platform_main}
else
  # If the devserver binary is overridden then use the templated binary
  readonly main=$(rlocation "TEMPLATED_main")
fi

if [ ! -f "${main}" ]; then
    printf "\n>>>> FAIL: The ts_devserver binary '${main_platform}' not found in runfiles.\n" >&2
    printf "This node toolchain was chosen based on your uname '${unameOut}'.\n" >&2
    printf "Please file an issue to https://github.com/bazelbuild/rules_nodejs/issues if \n" >&2
    printf "you would like to add your platform to the supported ts_devserver platforms. <<<<\n\n" >&2
    exit 1
fi

readonly manifest=$(rlocation "TEMPLATED_manifest")
readonly scripts_manifest=$(rlocation "TEMPLATED_scripts_manifest")

# Workaround for https://github.com/bazelbuild/bazel/issues/6764
# If this issue is incorporated into Bazel, the workaround here should be removed.
MSYS2_ARG_CONV_EXCL="*" "${main}" \
  -packages=TEMPLATED_packages \
  -serving_path=TEMPLATED_serving_path \
  -entry_module=TEMPLATED_entry_module \
  -port=TEMPLATED_port \
  -manifest="${manifest}" \
  -scripts_manifest="${scripts_manifest}" \
  "$@"

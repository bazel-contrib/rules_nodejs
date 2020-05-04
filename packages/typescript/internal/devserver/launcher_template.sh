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

# --- begin runfiles.bash initialization v2 ---
# Copy-pasted from the Bazel Bash runfiles library v2.
set -uo pipefail; f=build_bazel_rules_nodejs/third_party/github.com/bazelbuild/bazel/tools/bash/runfiles/runfiles.bash
source "${RUNFILES_DIR:-/dev/null}/$f" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "${RUNFILES_MANIFEST_FILE:-/dev/null}" | cut -f2- -d' ')" 2>/dev/null || \
  source "$0.runfiles/$f" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "$0.runfiles_manifest" | cut -f2- -d' ')" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "$0.exe.runfiles_manifest" | cut -f2- -d' ')" 2>/dev/null || \
  { echo>&2 "ERROR: cannot find $f"; exit 1; }; f=; set -e
# --- end runfiles.bash initialization v2 ---

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
  # The following paths must match up with //packages/typescript/devserver binaries
  # FIXME: we shouldn't hardcode "npm" repository name here
  darwin) readonly platform_main_manifest="npm/bazel/typescript/devserver/devserver-darwin_x64" ;;
  windows) readonly platform_main_manifest="npm/bazel/typescript/devserver/devserver-windows_x64.exe" ;;
  *) readonly platform_main_manifest="npm/bazel/typescript/devserver/devserver-linux_x64" ;;
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

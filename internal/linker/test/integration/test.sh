#!/usr/bin/env bash
# Copyright 2019 The Bazel Authors. All rights reserved.
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

# Immediately exit if any command fails.
set -e

# Turn on extra logging so that test failures are easier to debug
export VERBOSE_LOGS=1
export NODE_DEBUG=module

# --- begin runfiles.bash initialization v2 ---
# Copy-pasted from the Bazel Bash runfiles library v2.
set -uo pipefail; f=bazel_tools/tools/bash/runfiles/runfiles.bash
source "${RUNFILES_DIR:-/dev/null}/$f" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "${RUNFILES_MANIFEST_FILE:-/dev/null}" | cut -f2- -d' ')" 2>/dev/null || \
  source "$0.runfiles/$f" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "$0.runfiles_manifest" | cut -f2- -d' ')" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "$0.exe.runfiles_manifest" | cut -f2- -d' ')" 2>/dev/null || \
  { echo>&2 "ERROR: cannot find $f"; exit 1; }; f=; set -e
# --- end runfiles.bash initialization v2 ---

readonly DIR="${TEST_WORKSPACE}/internal/linker"

$(rlocation NODE_PATH) \
  $(rlocation $DIR/link_node_modules.js)\
  $(rlocation $DIR/test/integration/_example.module_mappings.json)

readonly ACTUAL=$(
  $(rlocation NODE_PATH) \
  --preserve-symlinks-main \
  $(rlocation $DIR/test/integration/program.js)
)

if [[ "$ACTUAL" != "1.2.3_a" ]]; then
  echo "expected 1.2.3_a but was ${out}" >&2
  exit 1
fi

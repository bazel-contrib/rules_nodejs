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

source "$(rlocation build_bazel_rules_nodejs/third_party/github.com/bazelbuild/bazel-skylib/tests/unittest.bash)" \
  || { echo "Could not source build_bazel_rules_nodejs/third_party/github.com/bazelbuild/bazel-skylib/tests/unittest.bash" >&2; exit 1; }

function test_map_to_output() {
  echo "$(rlocation build_bazel_rules_nodejs/internal/common/test/foo/bar/a.txt)" >"$TEST_log"
  # Test the foo/bar/a.txt is copied to bazel-out/
  expect_log 'bazel-out/'
  cat "$(rlocation build_bazel_rules_nodejs/internal/common/test/foo/bar/a.txt)" >"$TEST_log"
  # Test the content of foo/bar/a.txt is correct
  expect_log '#!/bin/bash'
  expect_log '^echo aaa$'
}

run_suite "map_to_output test suite"

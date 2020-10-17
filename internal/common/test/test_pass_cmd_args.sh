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

source "$(rlocation rules_nodejs/third_party/github.com/bazelbuild/bazel-skylib/tests/unittest.bash)" \
  || { echo "Could not source rules_nodejs/third_party/github.com/bazelbuild/bazel-skylib/tests/unittest.bash" >&2; exit 1; }

case "$(uname -s | tr [:upper:] [:lower:])" in
msys*|mingw*|cygwin*)
  declare -r is_windows=true
  ;;
*)
  declare -r is_windows=false
  ;;
esac

if "$is_windows"; then
  export MSYS_NO_PATHCONV=1
  export MSYS2_ARG_CONV_EXCL="*"
fi

function test_pass_cmd_args() {
  if "$is_windows"; then
    script=rules_nodejs/internal/common/test/print_cmd_args.bat
  else
    script=rules_nodejs/internal/common/test/print_cmd_args.sh
  fi

  "$(rlocation ${script})" '/foo bar' "\\foo \\bar" "/foo bar/" \foo\bar /foo/bar \\foo\\bar  "\foo\bar" "\\foo\\bar" '\foo\bar' '\\foo\\bar' >"$TEST_log"

  expect_log 'arg2=(/foo bar)'
  expect_log 'arg3=(\\foo \\bar)'
  expect_log 'arg4=(/foo bar/)'
  expect_log 'arg5=(foobar)'
  expect_log 'arg6=(/foo/bar)'
  expect_log 'arg7=(\\foo\\bar)'
  expect_log 'arg8=(\\foo\\bar)'
  expect_log 'arg9=(\\foo\\bar)'
  expect_log 'arg10=(\\foo\\bar)'
  expect_log 'arg11=(\\\\foo\\\\bar)'
}

run_suite "test_pass_cmd_args test suite"

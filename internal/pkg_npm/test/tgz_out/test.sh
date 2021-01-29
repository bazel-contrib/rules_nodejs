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

source "$(rlocation build_bazel_rules_nodejs/third_party/github.com/bazelbuild/bazel-skylib/tests/unittest.bash)" \
  || { echo "Could not source build_bazel_rules_nodejs/third_party/github.com/bazelbuild/bazel-skylib/tests/unittest.bash" >&2; exit 1; }

function test_tgz_package_json() {
    TGZ=$(rlocation build_bazel_rules_nodejs/internal/pkg_npm/test/tgz_out/my_tar.tgz)
    tar -vxf "${TGZ}"
    
    assert_contains "awesome-package" "./package/package.json"
    assert_contains "MAIN" "./package/main.js"
}

run_suite "test_tgz_package_json"

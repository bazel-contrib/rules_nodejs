# --- begin runfiles.bash initialization v2 ---
# Copy-pasted from the Bazel Bash runfiles library v2.
set -uo pipefail; f=build_bazel_rules_nodejs/third_party/github.com/bazelbuild/bazel/tools/bash/runfiles/runfiles.bash
source "${RUNFILES_DIR:-/dev/null}/$f" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "${RUNFILES_MANIFEST_FILE:-/dev/null}" | cut -f2- -d' ')" 2>/dev/null || \
  source "$0.runfiles/$f" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "$0.runfiles_manifest" | cut -f2- -d' ')" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "$0.exe.runfiles_manifest" | cut -f2- -d' ')" 2>/dev/null || \
  { echo>&2 "ERROR: cannot find $f"; exit 1; }; f=;
# --- end runfiles.bash initialization v2 ---

pack_command=$(rlocation $TEST_WORKSPACE/$1)
pkg_dir=$(rlocation $TEST_WORKSPACE/$2)

cd $TEST_TMPDIR

# Create the tar for the NPM package by running its `.pack` target.
# Note that we need to set `HOME` as otherwise NPM will fail with
# writing files to the cache.
HOME=. $pack_command
archive=./test-pkg-1.2.3.tgz

# Unpack the archive so that we can run the `diff` assertion, comparing
# the packed output with the actual NPM package directory.
tar -xvzf $archive

diff -r ./package $pkg_dir

if [ $? -ne 0 ]; then
    echo "The directories do not match. See output above.";
    exit 3
fi

exit 0
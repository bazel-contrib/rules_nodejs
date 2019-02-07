#!/usr/bin/env bash
# This script runs each of the examples during CI to make sure they still work.
# Note that integration test coverage is expected to be provided mostly by the /internal/e2e/* folders.
# These examples should be convenient for users to reference, not exercise all our features.

set -u -e -o pipefail
cd $(dirname $0)

# Make sure the distro is up-to-date and can be referenced at bazel-bin/rules_nodejs_package
bazel build --symlink_prefix=bazel- //:local_testing_package

for testDir in $(ls) ; do
  [[ -d "$testDir" ]] || continue
  (  
    cd $testDir
    echo ""
    echo "#################################################################################"
    echo "Testing example in $(pwd)"
    echo ""
    yarn test
  )
done

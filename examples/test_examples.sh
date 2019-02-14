#!/usr/bin/env bash
# This script runs each of the examples during CI to make sure they still work.
# Note that integration test coverage is expected to be provided mostly by the /internal/e2e/* folders.
# These examples should be convenient for users to reference, not exercise all our features.

set -u -e -o pipefail

TESTS_ROOT_DIR=$(cd $(dirname "$0"); pwd)
NODEJS_ROOT_DIR=$(cd $TESTS_ROOT_DIR/..; pwd)

KERNEL_NAME=$(uname -s)

# Make sure the distro is up-to-date and can be referenced at bazel-bin/rules_nodejs_package
cd $NODEJS_ROOT_DIR
bazel build --symlink_prefix=bazel- //:local_testing_package

cd $TESTS_ROOT_DIR
for testDir in $(ls) ; do
  [[ -d "$testDir" ]] || continue
  (  
    cd $testDir
    echo ""
    echo "#################################################################################"
    echo "Testing example in $(pwd)"
    echo ""
    if [[ $testDir == "vendored_node" && $KERNEL_NAME != Linux* ]] ; then
      echo "Skipping vendored_node test as it only runs on Linux while we are executing on $KERNEL_NAME"
    else
      yarn test
    fi
  )
done

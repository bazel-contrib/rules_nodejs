#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

E2E_DIR=$(cd $(dirname "$0"); pwd)
RULES_NODEJS_DIR=$(cd $E2E_DIR/..; pwd)
PACKAGES_DIR=$RULES_NODEJS_DIR/packages
SHARD_INDEX=${1:-0}
MAX_SHARDS=${2:-1}

# Build local testing rules_nodejs package
printf "\n\nBuilding //:local_testing_package\n"
cd $RULES_NODEJS_DIR
bazel build //:local_testing_package

# Build all npm packages
cd $PACKAGES_DIR
for packageDir in $(ls) ; do
  [[ -d "$packageDir" ]] || continue
  (
    cd $packageDir
    if [[ -e 'WORKSPACE' && -e 'BUILD.bazel' && $(grep "name = \"npm_package\"," BUILD.bazel) ]];then
      printf "\n\nBuilding //:npm_package in /packages/$packageDir\n"
      bazel build //:npm_package
    fi
  )
done

# Gather list of tests to run
printf "\n\nFinding e2e tests with shard index $SHARD_INDEX and max shards $MAX_SHARDS\n"
cd $E2E_DIR
TEST_DIRS=()
TEST_INDEX=$SHARD_INDEX
for e2eDir in $(ls) ; do
  [[ -d "$e2eDir" ]] || continue
  if ! (( TEST_INDEX % MAX_SHARDS )) ; then
    TEST_DIRS+=($e2eDir)
  fi
  TEST_INDEX=$((TEST_INDEX+1))
done
echo "Running e2e tests: ${TEST_DIRS[@]}"

# Run e2e tests
for e2eDir in ${TEST_DIRS[@]} ; do
  ( 
    cd $e2eDir
    printf "\n\nRunning e2e test $e2eDir\n"
    yarn test
  )
done

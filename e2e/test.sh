#!/usr/bin/env bash

set -eux -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -x: shows the commands that get run
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

E2E_DIR=$(cd $(dirname "$0"); pwd)
RULES_NODEJS_DIR=$(cd $E2E_DIR/..; pwd)
PACKAGES_DIR=$RULES_NODEJS_DIR/packages

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

# Run all e2e tests
cd $E2E_DIR
for e2eDir in $(ls) ; do
  [[ -d "$e2eDir" ]] || continue
  ( 
    cd $e2eDir
    printf "\n\nRunning e2e test $e2eDir\n"
    yarn test
  )
done

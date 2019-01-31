#!/usr/bin/env bash

set -u -e -o pipefail

cd $(dirname "$0")
TESTS_ROOT_DIR=$(pwd)

echo ""
echo "#################################################################################"
echo "Running all npm package e2e tests under $TESTS_ROOT_DIR"
echo ""
echo "To run a specific test run this script with `--test <test_name>` where <test_name>"
echo "is the name of the test folder to run"
echo ""
echo "Run this script with `--update-lock-files` to update yarn.lock files"
echo "instead of running tests"
echo ""

# Determine the absolute paths to the generated @bazel/typescript and @bazel/karma npm packages
cd $TESTS_ROOT_DIR/../../..
BAZEL=$(pwd)/node_modules/.bin/bazel
if [[ ! -f $BAZEL ]] ; then
  echo "Bazel not found under $BAZEL"
  exit 1
fi
BAZEL_BIN=$($BAZEL info bazel-bin)
BAZEL_TYPESCRIPT_NPM_PACKAGE=$BAZEL_BIN/internal/npm_package
BAZEL_KARMA_NPM_PACKAGE=$BAZEL_BIN/internal/karma/npm_package
echo "@bazel/typescript: $BAZEL_TYPESCRIPT_NPM_PACKAGE"
echo "@bazel/karma: $BAZEL_KARMA_NPM_PACKAGE"

# Now run all e2e tests
cd $TESTS_ROOT_DIR
for testDir in $(ls) ; do
  [[ -d "$testDir" ]] || continue
  (
    cd $testDir
    echo ""
    echo "#################################################################################"
    echo "Running npm package e2e test $(pwd)"
    echo ""
    if [[ ! -f "package-template.json" ]] ; then
      echo "No package-template.json file found in $testDir"
      exit 1
    fi
    # Generate package.json subsituting variables
    # BAZEL_TYPESCRIPT_NPM_PACKAGE and BAZEL_KARMA_NPM_PACKAGE
    ESCAPED_TYPESCRIPT=$(echo $BAZEL_TYPESCRIPT_NPM_PACKAGE | sed 's/\//\\\//g')
    ESCAPED_KARMA=$(echo $BAZEL_KARMA_NPM_PACKAGE | sed 's/\//\\\//g')
    sed -e "s/\${BAZEL_TYPESCRIPT_NPM_PACKAGE}/$ESCAPED_TYPESCRIPT/" -e "s/\${BAZEL_KARMA_NPM_PACKAGE}/$ESCAPED_KARMA/" package-template.json > package.json
    if [[ $# -ge 1 && $1 = "--update-lock-files" ]] ; then
      # Update yarn.lock files
      echo "Running yarn install to update lock file"
      yarn install
    else
      if [[ $# -ge 2 && $1 = "--test" && $2 != $testDir ]] ; then
        # Skip this test
        echo "Skipping test that was not specified in --test argument"
      else
        # Run tests
        yarn test
      fi
    fi
  )
done

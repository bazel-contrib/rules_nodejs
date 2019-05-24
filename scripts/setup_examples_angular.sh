#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
readonly EXAMPLES_DIR="${RULES_NODEJS_DIR}/examples"
source "${RULES_NODEJS_DIR}/scripts/packages.sh"

echo_and_run() { echo "+ $@" ; "$@" ; }

# sedi makes `sed -i` work on both OSX & Linux
# See https://stackoverflow.com/questions/2320564/i-need-my-sed-i-command-for-in-place-editing-to-work-with-both-gnu-sed-and-bsd
sedi () {
  case $(uname) in
    Darwin*) sedi=('-i' '') ;;
    *) sedi='-i' ;;
  esac

  sed "${sedi[@]}" "$@"
}

printf "\n\nSetting up /examples/angular\n"

(
  # Clean example
  echo_and_run cd ${EXAMPLES_DIR}
  rm -rf angular
  echo_and_run git clone https://github.com/angular/angular-bazel-example.git angular
  (
    echo_and_run cd angular

    # Replace @bazel/foobar packages in package.json with file paths to locally generated packages
    for package in ${PACKAGES[@]} ; do
      echo_and_run sedi "s#\"@bazel\/${package}\":[[:blank:]]*\"[_\-\.a-zA-Z0-9]*\"#\"@bazel\/${package}\": \"file://${RULES_NODEJS_DIR}/dist/npm_bazel_${package}\"#" package.json
    done

    # We can't do multi-line replacements with sed so we'll keep the http_archive
    # for rules_nodejs and point it to our release archive instead. We comment out all
    # sha256 lines as well to make this work.
    echo_and_run sedi "s#urls* = \[*\"https:\/\/github\.com\/[a-zA-Z_]*\/rules_nodejs[^\"]*\"\]*#url = \"file://${RULES_NODEJS_DIR}/dist/build_bazel_rules_nodejs/release.tar.gz\"#" WORKSPACE
    echo_and_run sedi "s#sha256 =#\# sha256 =#" WORKSPACE

    # Check that above replacements worked
    if ! grep -q "dist/npm_bazel_" package.json; then
      echo "package.json replacements failed!"
      exit 1
    fi
    if ! grep -q "dist/build_bazel_rules_nodejs/release.tar.gz" WORKSPACE; then
      echo "WORKSPACE replacements failed!"
      exit 1
    fi
  )
)

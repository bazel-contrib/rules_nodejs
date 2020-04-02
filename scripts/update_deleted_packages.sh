#!/usr/bin/env bash

# Vendor in files from npm based on /third_party/npm/package.json & /third_party/npm/yarn.lock

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

# sedi makes `sed -i` work on both OSX & Linux
# See https://stackoverflow.com/questions/2320564/i-need-my-sed-i-command-for-in-place-editing-to-work-with-both-gnu-sed-and-bsd
function sedi () {
  case $(uname) in
    Darwin*) sedi=('-i' '') ;;
    *) sedi='-i' ;;
  esac

  sed "${sedi[@]}" "$@"
}

# joins subsequent arguments with the first argument delimiter
function join_by {
  local IFS="$1";
  shift;
  echo "$*";
}

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)

(
  cd ${RULES_NODEJS_DIR}

  # remove any node_modules folders first
  readonly node_modules=$(find {examples,e2e}/*/* -type d -name node_modules -prune)
  rm -rf ${node_modules}

  # then update .bazelrc
  readonly deleted_packages=$(join_by , $(find {examples,e2e}/*/* -type f \( -name BUILD -o -name BUILD.bazel \) | xargs -n 1 dirname))
  echo "--deleted_packages=${deleted_packages}"
  sedi "s#--deleted_packages=.*#--deleted_packages=${deleted_packages}#" .bazelrc
)

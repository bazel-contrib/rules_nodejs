#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)

# sedi makes `sed -i` work on both OSX & Linux
# See https://stackoverflow.com/questions/2320564/i-need-my-sed-i-command-for-in-place-editing-to-work-with-both-gnu-sed-and-bsd
sedi () {
  case $(uname) in
    Darwin*) sedi=('-i' '') ;;
    *) sedi='-i' ;;
  esac

  sed "${sedi[@]}" "$@"
}

# Replaces "bazel://@npm_bazel_foobar//:npm_package" with absolute
# path to generated npm package under /dist/npm_bazel_foobar
sedi "s#\"bazel://@\([a-z_]*\)//:npm_package\"#\"file://${RULES_NODEJS_DIR}/dist/\1\"#" package.json

DEPS=()

# Check for WORKSPACE dependency on release
LINES=$(grep "/dist/build_bazel_rules_nodejs/release\"" WORKSPACE || echo "")
if [[ "${LINES}" ]] ; then
  DEPS+=( release )
fi

# Check for dependencies in package.json
LINES=$(egrep -oh "/dist/npm_bazel_([a-z_]+)\"" package.json || echo "")
for line in ${LINES[@]} ; do
  # Trim the match from `/dist/npm_bazel_foobar"` to `foobar`
  DEP=$(echo $line | cut -c 17- | rev | cut -c 2- | rev)
  DEPS+=(${DEP})
done

if [[ ${DEPS:-} ]] ; then
  ${RULES_NODEJS_DIR}/scripts/check_deps.sh ${DEPS[@]}
fi

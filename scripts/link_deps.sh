#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)

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

${RULES_NODEJS_DIR}/scripts/unlink_deps.sh

DEPS=()
PACKAGES=()

# Check for WORKSPACE dependency on release dist
LINES=$(grep "/dist/build_bazel_rules_nodejs/release\"" WORKSPACE || echo "")
if [[ "${LINES}" ]] ; then
  DEPS+=( release )
fi

# Check for bazel://@npm_bazel_foobar dependencies in package.json
LINES=$(egrep -oh "bazel://@npm_bazel_([a-z_]+)" package.json || echo "")
for line in ${LINES[@]} ; do
  # Trim the match from `bazel://@npm_bazel_foobar` to `foobar`
  DEP=$(echo $line | cut -c 20-)
  DEPS+=(${DEP})
  PACKAGES+=(${DEP})
done

if [[ ${DEPS:-} ]] ; then
  ${RULES_NODEJS_DIR}/scripts/check_deps.sh ${DEPS[@]}
fi

for package in ${PACKAGES[@]:-} ; do
  # Find name of dist dir (the postfix $RANDOM changes each time it is re-generated)
  results=$(ls -d ${RULES_NODEJS_DIR}/dist/npm_bazel_${package}\$* 2> /dev/null || :)
  if [[ -z "${results}" ]] ; then
    echo "ERROR: You must first run 'yarn build_packages ${package}' or 'yarn build_packages_all'";
    exit 1
  fi

  # Replaces "bazel://@npm_bazel_foobar//:npm_package" with absolute
  # path to generated npm package under /dist/npm_bazel_foobar
  echo_and_run sedi "s#\"bazel://@npm_bazel_${package}//:npm_package\"#\"file://${results}\"#" package.json
done

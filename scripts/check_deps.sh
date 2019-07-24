#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
source "${RULES_NODEJS_DIR}/scripts/packages.sh"

DEPS=()

# Check for WORKSPACE dependency on release
LINES=$(grep "/release/build_bazel_rules_nodejs/release\"" WORKSPACE || echo "")
if [[ "${LINES}" ]] ; then
  DEPS+=(release)
fi

# Check for file:../../release/npm_bazel_foobar dependencies in package.json
LINES=$(egrep -oh "file:../../release/npm_bazel_([a-z_\-]+)" package.json || echo "")
for line in ${LINES[@]} ; do
  # Trim the match from `file:../../release/npm_bazel_foobar` to `foobar`
  DEP=$(echo $line | cut -c 27-)
  DEPS+=(${DEP})
done

if [[ ${DEPS:-} ]] ; then
  ALL_GOOD=1

  echo "checking deps: ${DEPS}"
  for dep in ${DEPS} ; do
    if [[ ${dep} == "release" ]] ; then
      if [[ ! -d "${RULES_NODEJS_DIR}/release/build_bazel_rules_nodejs" ]] ; then
          echo "ERROR: You must first run 'yarn build_release' to build /release/build_bazel_rules_nodejs";
          ALL_GOOD=0
      fi
    else
      if [[ ! -d "${RULES_NODEJS_DIR}/release/npm_bazel_${dep}" ]] ; then
        echo "ERROR: You must first run 'yarn build_packages ${dep}' or 'yarn build_packages_all'";
        ALL_GOOD=0
      fi
    fi
  done

  if [[ ${ALL_GOOD} -eq "0" ]] ; then
    echo "ERROR: Some dependencies are not built. Please build all dependencies and try again."
    exit 1
  else
    echo "all deps built"
  fi
fi
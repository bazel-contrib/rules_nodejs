#!/bin/sh

set -x -eu -o pipefail

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
cd "${RULES_NODEJS_DIR}/packages"

# Don't accidentally publish extra files, such as previous binaries
git clean -fx

# VERSION is e.g. 0.18.0
readonly VERSION=$1
if [[ -z "$VERSION" ]]; then
  echo "Usage: mirror_buildtools.sh [version]"
  exit 1
fi

readonly BASEURI="https://github.com/bazelbuild/buildtools/releases/download/${VERSION}"
readonly NPM=$(which npm)

function doMirror () {
  local PACKAGE=$1
  local FILENAME=$2
  local TOOL="buildifier"

  wget -P ${PACKAGE}/ ${BASEURI}/${FILENAME}
  tmp=$(mktemp)
  jq ".bin.${TOOL} = \"./${FILENAME}\" | .version = \"${VERSION}\"" < ${PACKAGE}/package.json > $tmp
  mv $tmp ${PACKAGE}/package.json
  node --max-old-space-size=8192 $NPM publish $PACKAGE
}

doMirror buildifier-darwin_x64 buildifier.osx
doMirror buildifier-linux_x64 buildifier

tmp=$(mktemp)
jq ".version = \"${VERSION}\" | .optionalDependencies[] = \"${VERSION}\"" < buildifier/package.json > $tmp
mv $tmp buildifier/package.json
$NPM publish buildifier

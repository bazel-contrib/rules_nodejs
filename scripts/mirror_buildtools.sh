#!/usr/bin/env bash

set -x -eu -o pipefail

readonly DRY_RUN="" # uncomment for testing: "--dry-run"
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
  local TOOL=$2
  local EXT=${3-""}
  local FILENAME=$TOOL
  if [ ! -z "$EXT" ]; then
    FILENAME="${FILENAME}.${EXT}"
  fi

  wget -P ${PACKAGE}/ ${BASEURI}/${FILENAME}
  tmp=$(mktemp)
  jq ".bin.${TOOL} = \"./${FILENAME}\" | .version = \"${VERSION}\"" < ${PACKAGE}/package.json > $tmp
  mv $tmp ${PACKAGE}/package.json
  node --max-old-space-size=8192 $NPM publish --access=public $DRY_RUN $PACKAGE
}

doMirror buildozer-linux_x64 buildozer
doMirror buildozer-darwin_x64 buildozer mac
doMirror buildozer-win32_x64 buildozer exe
doMirror buildifier-linux_x64 buildifier
doMirror buildifier-darwin_x64 buildifier mac
doMirror buildifier-win32_x64 buildifier exe

tmp=$(mktemp)
for p in buildozer buildifier; do
  jq ".version = \"${VERSION}\" | .optionalDependencies[] = \"${VERSION}\"" < $p/package.json > $tmp
  mv $tmp $p/package.json
  $NPM publish --access=public $DRY_RUN $p
done

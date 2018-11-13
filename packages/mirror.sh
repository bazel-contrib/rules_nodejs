#!/bin/sh

set -x

# Don't accidentally publish extra files, such as previous bazel binaries
git clean -fx

# VERSION is e.g. 0.18.0
readonly VERSION=$1
if [[ -z "$VERSION" ]]; then
  echo "Usage: mirror.sh [version]"
  exit 1
fi
# RC can be supplied, e.g. rc4
# otherwise we take the final release
readonly RC=$2
if [[ -z "$RC" ]]; then
  readonly FOLDER="release"
  readonly NEWVERSION=$VERSION
else
  readonly FOLDER=$RC
  readonly NEWVERSION="${VERSION}-${RC}"
fi
readonly BASENAME="bazel-${VERSION}${RC}"
readonly BASEURI="https://releases.bazel.build/${VERSION}/${FOLDER}"
readonly NPM=$(which npm)

function doMirror () {
  local PACKAGE=$1
  local FILENAME=$2

  wget -P ${PACKAGE}/ ${BASEURI}/${FILENAME}
  tmp=$(mktemp)
  jq ".bin.bazel = \"./${FILENAME}\" | .version = \"${NEWVERSION}\"" < ${PACKAGE}/package.json > $tmp
  mv $tmp ${PACKAGE}/package.json
  node --max-old-space-size=8192 $NPM publish $PACKAGE
}

doMirror bazel-win32_x64 ${BASENAME}-windows-x86_64.exe
doMirror bazel-darwin_x64 ${BASENAME}-darwin-x86_64
doMirror bazel-linux_x64 ${BASENAME}-linux-x86_64

tmp=$(mktemp)
jq ".version = \"${NEWVERSION}\" | .optionalDependencies[] = \"${NEWVERSION}\"" < bazel/package.json > $tmp
mv $tmp bazel/package.json
$NPM publish bazel

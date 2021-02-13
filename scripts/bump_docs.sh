#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly BAZEL=./node_modules/.bin/bazel
readonly NEXT_VERSION=$(jq -r .version package.json)

# build the HEAD verison of all the readmes
$BAZEL build //docs-site/src/pages/HEAD:readmes

# make a new directory for the next version
mkdir docs-site/src/pages/"${NEXT_VERSION}"

# sync over the generated HEAD readmes from bazel-out into the new versioned folder
rsync -rtq ./dist/bin/docs-site/src/pages/HEAD/*.md ./docs-site/src/pages/"${NEXT_VERSION}"

# sync over the static HEAD readmes from the source folder
rsync -rtq ./docs-site/src/pages/HEAD/*.md ./docs-site/src/pages/"${NEXT_VERSION}"

# done, tell the user to call 'yarn stardoc' when they are happy with the docs
# this will then build the doc-site and copy it to /docs ready to commit

echo "Updated doc-site for version ${NEXT_VERSION}"
echo "When ready, run 'yarn stardoc'"

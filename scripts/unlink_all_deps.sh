#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
cd ${RULES_NODEJS_DIR}

for rootDir in packages examples e2e internal/e2e ; do
  (
    cd ${rootDir}
    for subDir in $(ls) ; do
      [[ -d "${subDir}" ]] || continue
      (
        cd ${subDir}
        if [[ -e 'package.json' ]] ; then
          ${RULES_NODEJS_DIR}/scripts/unlink_deps.sh
        fi
      )
    done
  )
done

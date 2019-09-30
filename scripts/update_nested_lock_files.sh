#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

echo_and_run() { echo "+ $@" ; "$@" ; }

readonly workspaceRoots=("e2e" "examples")
for workspaceRoot in ${workspaceRoots[@]} ; do
  (
    readonly workspaceFiles=($(find ./${workspaceRoot} -type f -name WORKSPACE -prune))
    for workspaceFile in ${workspaceFiles[@]} ; do
      (
        readonly workspaceDir=$(dirname ${workspaceFile})
        cd ${workspaceDir}
        if [ -f "./yarn.lock" ]; then
            printf "\n\nupdating ${workspaceDir}/yarn.lock\n"
            echo_and_run rm -rf node_modules
            echo_and_run yarn install
        fi
        if [ -f "./package-lock.json" ]; then
            printf "\n\nupdating ${workspaceDir}/package-lock.json\n"
            echo_and_run rm -rf node_modules
            echo_and_run npm install
        fi
        echo_and_run rm -rf node_modules
      )
    done
  )
done

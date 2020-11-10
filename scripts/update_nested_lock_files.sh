#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

echo_and_run() { echo "+ $@" ; "$@" ; }

VERSION=${1:-latest}

readonly workspaceRoots=("e2e" "examples")
for workspaceRoot in ${workspaceRoots[@]} ; do
  (
    readonly workspaceFiles=($(find ./${workspaceRoot} -type f -name WORKSPACE -prune -maxdepth 2))
    echo "workspace files: ${workspaceFiles[@]}"
    for workspaceFile in ${workspaceFiles[@]} ; do
      (
        readonly workspaceDir=$(dirname ${workspaceFile})
        if [ ${workspaceDir} == "./examples/vue" ]; then
          # vue 'npm ci' has issues but there are no deps there so we skip it for now
          continue
        fi
        printf "\n============================================\nupdating ${workspaceDir}\n============================================\n\n"
        cd ${workspaceDir}
        readonly packages=$(cat package.json | grep \"@bazel/ | grep -v \"@bazel/bazelisk | awk -F: '{ print $1 }' | sed 's/[",]//g' | tr -d ' ')
        if [ -f "./yarn.lock" ]; then
            printf "updating ${workspaceDir}/yarn.lock\n"
            echo_and_run rm -rf node_modules
            # `yarn install` will not update stale deps so we also need to run
            # `yarn install @bazel/foobar@${VERSION}` for each package in the @bazel
            # scope
            echo_and_run yarn install --ignore-scripts
            for package in ${packages[@]} ; do
              echo_and_run yarn add ${package}@${VERSION} --ignore-scripts
            done
        fi
        if [ -f "./package-lock.json" ]; then
            printf "updating ${workspaceDir}/package-lock.json\n"
            echo_and_run rm -rf node_modules
            # `npm ci` will not update stale deps so we also need to run
            # `npm install @bazel/foobar@${VERSION}` for each package in the @bazel
            # scope
            echo_and_run npm ci
            for package in ${packages[@]} ; do
              echo_and_run npm install ${package}@${VERSION}
            done
        fi
        echo_and_run rm -rf node_modules
      )
    done
  )
done

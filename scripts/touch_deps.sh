#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly PACKAGES=${@:?"No package names specified"}

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

cd ${RULES_NODEJS_DIR}
for rootDir in examples e2e internal/e2e ; do
  (
    cd ${rootDir}
    for subDir in $(ls) ; do
      [[ -d "${subDir}" ]] || continue
      (
        cd ${subDir}
        if [[ -e 'package.json' ]] ; then
          DEPS=()
          # Check for file:../../dist/npm_bazel_foobar dependencies in package.json
          LINES=$(egrep -oh "file:../../dist/npm_bazel_([a-z_]+)" package.json || echo "")
          for line in ${LINES[@]} ; do
            # Trim the match from `file:../../dist/npm_bazel_foobar` to `foobar`
            DEP=$(echo $line | cut -c 27-)
            DEPS+=(${DEP})
          done
          if [[ ${DEPS:-} ]] ; then
            for dep in ${DEPS[@]} ; do
              for package in ${PACKAGES[@]} ; do
                if [[ ${dep} == ${package} ]] ; then
                  # Delete the node_modules/@bazel/foobar npm package in this nested
                  # WORKSPACE since we have just regerated it and this old copy
                  # is now out of date.
                  echo "Deleting /${rootDir}/${subDir}/node_modules/@bazel/${dep}"
                  echo_and_run rm -rf ./node_modules/@bazel/${dep}
                  # Modify the yarn.lock entry for the new generated package
                  # in this nested WORKSPACE to trick Bazel into re-running the repository
                  # rule. Since package.json didn't change, yarn_install would
                  # not otherwise know that it has to re-run to re-install the @bazel/foobar
                  # npm package.
                  echo_and_run sedi "s#/dist/npm_bazel_${package}\\\$\{0,1\}[0-9]\{0,10\}#/dist/npm_bazel_${package}\$${RANDOM}#" yarn.lock
                fi
              done
            done
          fi
        fi
      )
    done
  )
done

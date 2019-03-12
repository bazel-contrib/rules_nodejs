#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
cd ${RULES_NODEJS_DIR}

echo_and_run() { echo "+ $@" ; "$@" ; }

# Check environment
unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     machine=Linux;;
    Darwin*)    machine=Mac;;
    CYGWIN*)    machine=Cygwin;;
    MINGW*)     machine=MinGw;;
    MSYS_NT*)   machine=Windows;;
    *)          machine="UNKNOWN:${unameOut}"
esac
echo "Running on ${machine}"

printf "\n\nRunning @nodejs//:yarn\n"
echo_and_run bazel run @nodejs//:yarn

printf "\n\nBuilding all targets\n"
echo_and_run bazel build ...

printf "\n\nTesting all targets\n"
if [[ ${machine} == "Windows" ]] ; then
    echo_and_runbazel test ... --test_tag_filters=-fix-windows
else
    echo_and_run bazel test ...
fi

# These targets should run
printf "\n\nTesting set of runnable targets\n"
echo_and_run bazel run //internal/node/test:no_deps
echo_and_run bazel run //internal/node/test:has_deps_legacy
echo_and_run bazel run //internal/node/test:has_deps
echo_and_run bazel run //internal/node/test:has_deps_hybrid
echo_and_run bazel run //internal/e2e/fine_grained_no_bin:index
echo_and_run bazel run @fine_grained_deps_yarn//typescript/bin:tsc

# bazel test @examples_program//... # DOES NOT WORK WITH --nolegacy_external_runfiles
# bazel test @packages_example//... # DOES NOT WORK WITH --nolegacy_external_runfiles

echo_and_run ./scripts/build_release.sh
echo_and_run ./scripts/build_packages_all.sh

echo_and_run ./scripts/test_packages_all.sh
echo_and_run ./scripts/test_e2e_all.sh
echo_and_run ./scripts/test_legacy_e2e_all.sh
echo_and_run ./scripts/test_examples_all.sh

#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

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

printf "\n\nTesting all targets (except integration tests)\n"
if [[ ${machine} == "Windows" ]] ; then
    echo_and_run yarn test_windows
else
    echo_and_run yarn test
fi

# These targets should run
printf "\n\nTesting set of runnable targets\n"
echo_and_run bazel run //internal/node/test:no_deps
echo_and_run bazel run //internal/node/test:has_deps_legacy
echo_and_run bazel run //internal/node/test:has_deps
echo_and_run bazel run //internal/node/test:has_deps_hybrid
echo_and_run bazel run //internal/node/test:module_name_test
echo_and_run bazel run //internal/npm_install/test:index
echo_and_run bazel run @fine_grained_deps_yarn//typescript/bin:tsc

# TODO: Once https://github.com/bazelbuild/bazel/pull/8090 lands targets
# can be changed to test targets and we can run them with `bazel test`
echo_and_run bazel run @bazel_workspace_a//:bin
echo_and_run bazel run @bazel_workspace_a//subdir:bin
echo_and_run bazel run @bazel_workspace_b//:bin
echo_and_run bazel run @bazel_workspace_b//subdir:bin

# bazel test @examples_user_managed_deps//... # DOES NOT WORK WITH --nolegacy_external_runfiles
# bazel test @e2e_packages//... # DOES NOT WORK WITH --nolegacy_external_runfiles
# TODO: re-enable when after https://github.com/bazelbuild/bazel/pull/8090 makes it into a Bazel release
# Related issue https://github.com/bazelbuild/bazel/issues/8088 on Windows

printf "\n\nRunning all e2e tests (this make take some time as these are run sequentially...)\n"
echo_and_run yarn test_e2e

printf "\n\nRunning all examples (this make take some time as these are run sequentially...)\n"
echo_and_run yarn test_examples

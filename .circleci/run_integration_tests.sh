#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly SHARD_INDEX=${1:-0}
readonly MAX_SHARDS=${2:-1}

# Get a sorted list of all test targets. We sort to ensure that each shard gets the same list
# incase there is any inconstencies with bazel query on different shards.
readonly QUERY_RESULT=$(bazel query 'kind("bazel_integration_test", //examples/... union //e2e/...) except attr("tags", "no-circleci", //examples/... union //e2e/...)')
declare TEST_TARGETS_ARRAY=()
for target in ${QUERY_RESULT}; do
  TEST_TARGETS_ARRAY+=("${target}")
done
IFS=$'\n'
TEST_TARGETS=($(sort <<<"${TEST_TARGETS_ARRAY[*]}"))
unset IFS

# Get the list of test targets for this shard
declare s=${SHARD_INDEX}
declare SHARD_TARGETS=()
for target in ${TEST_TARGETS[@]:-}; do
  if (( ${s} % ${MAX_SHARDS} == 0 )); then
    SHARD_TARGETS+=("${target}")
  fi
  ((s=s+1))
done

# Run integration tests
echo "Shard index ${SHARD_INDEX} of ${MAX_SHARDS} shards"
echo "Targets: ${SHARD_TARGETS[@]:-}"
echo
bazel test --local_ram_resources=792 --test_arg=--local_ram_resources=13312 --test_arg=--local_cpu_resources=7 ${SHARD_TARGETS[@]:-} --test_output=streamed

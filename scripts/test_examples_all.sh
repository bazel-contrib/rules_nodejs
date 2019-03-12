#!/usr/bin/env bash
# This script runs each of the examples during CI to make sure they still work.
# Note that integration test coverage is expected to be provided mostly by the /internal/e2e/* folders.
# These examples should be convenient for users to reference, not exercise all our features.

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
readonly EXAMPLES_DIR="${RULES_NODEJS_DIR}/examples"
SHARD_INDEX=${1:-0}
readonly MAX_SHARDS=${2:-1}

# Gather list of examples to run
printf "\n\nFinding examples using shard index ${SHARD_INDEX} and max shards ${MAX_SHARDS}\n"
cd ${EXAMPLES_DIR}
SHARD_DIRS=()
for shardDir in $(ls) ; do
  [[ -d "${shardDir}" ]] || continue
  if ! (( SHARD_INDEX % MAX_SHARDS )) ; then
    SHARD_DIRS+=(${shardDir})
  fi
  SHARD_INDEX=$((SHARD_INDEX+1))
done
echo "Running examples: ${SHARD_DIRS[@]}"

# Run examples
${RULES_NODEJS_DIR}/scripts/test_examples.sh ${SHARD_DIRS[@]}

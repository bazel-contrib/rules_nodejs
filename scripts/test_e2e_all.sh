#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
readonly E2E_DIR="${RULES_NODEJS_DIR}/e2e"
SHARD_INDEX=${1:-0}
readonly MAX_SHARDS=${2:-1}

# Gather list of tests to run
printf "\n\nFinding e2e tests using shard index ${SHARD_INDEX} and max shards ${MAX_SHARDS}\n"
cd ${E2E_DIR}
SHARD_DIRS=()
for shardDir in $(ls) ; do
  [[ -d "${shardDir}" ]] || continue
  if ! (( SHARD_INDEX % MAX_SHARDS )) ; then
    SHARD_DIRS+=(${shardDir})
  fi
  SHARD_INDEX=$((SHARD_INDEX+1))
done
echo "Running e2e tests: ${SHARD_DIRS[@]}"

# Run e2e tests
for shardDir in ${SHARD_DIRS[@]} ; do
  ${RULES_NODEJS_DIR}/scripts/test_e2e.sh ${shardDir}
done

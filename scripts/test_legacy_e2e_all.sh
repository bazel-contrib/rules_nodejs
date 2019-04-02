#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
readonly E2E_DIR="${RULES_NODEJS_DIR}/internal/e2e"
SHARD_INDEX=${1:-0}
readonly MAX_SHARDS=${2:-1}

# Gather list of tests to run
printf "\n\nFinding legacy e2e tests with shard index ${SHARD_INDEX} and max shards ${MAX_SHARDS}\n"
cd ${E2E_DIR}
SHARD_DIRS=()
for shardDir in $(ls) ; do
  [[ -d "${shardDir}" && -e "${shardDir}/WORKSPACE" ]] || continue
  if ! (( SHARD_INDEX % MAX_SHARDS )) ; then
    SHARD_DIRS+=(${shardDir})
  fi
  SHARD_INDEX=$((SHARD_INDEX+1))
done
echo "Running e2e tests: ${SHARD_DIRS[@]}"

# Run legacy e2e tests
${RULES_NODEJS_DIR}/scripts/test_legacy_e2e.sh ${SHARD_DIRS[@]}

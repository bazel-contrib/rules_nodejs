#!/usr/bin/env bash

set -uo pipefail;

while [ "$#" -ne 0 ]; do
  [[ "lib_metadata.json" == "$(basename $1)" ]] && exit 1;
  shift;
done

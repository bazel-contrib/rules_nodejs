#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

# Define packages so that dependencies come first as locally
# they will be built in the order provided
export readonly PACKAGES=( typescript karma jasmine labs )

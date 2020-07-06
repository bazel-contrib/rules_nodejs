#!/usr/bin/env bash
# Update the owners=[] attribute in //.github:gen_codeowners
set -euo pipefail

BAZEL=./node_modules/.bin/bazel
BUILDOZER=./node_modules/.bin/buildozer

readonly new_owners=$(
    # Query for all codeowners() rules (anchor at the front to avoid match on generate_codeowners rule)
    $BAZEL query --output=label 'kind("^codeowners rule", //...)' | 
    # Print the length of each label at the front of the line
    awk '{ print length, $0 }' | 
    # Sort shortest-first, so that the root //:OWNERS ends up first in CODEOWNERS
    sort -n -s | 
    # 43 label -> "label"
    awk '{ print "\x22" $2 "\x22" }' | 
    # comma-separated
    tr '\n' ','
)

readonly command="set owners [$new_owners]|//.github:gen_codeowners"

echo $command | $BUILDOZER -f - && $BAZEL run //.github:codeowners.update

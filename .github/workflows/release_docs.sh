#!/usr/bin/env bash
# Add generated API docs to the release
# see https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/stardoc.md
set -o errexit -o nounset -o pipefail

docs="$(mktemp -d)"
targets="$(mktemp)"
out=$1
bazel --output_base="$docs" query --output=label --output_file="$targets" 'kind("starlark_doc_extract rule", //...)'
bazel --output_base="$docs" build --target_pattern_file="$targets"
tar --create --auto-compress \
	--directory "$(bazel --output_base="$docs" info bazel-bin)" \
	--file "${out}" .

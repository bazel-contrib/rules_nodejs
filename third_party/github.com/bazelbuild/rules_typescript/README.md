# build_bazel_rules_typescript

This repo contains a mirror of some Google-internal bits that support TypeScript development under Bazel.

It contains these utilities:

- `ts_devserver`: a Go library and binary that runs a fast local web server which concatenates JavaScript on-the-fly. It requires inputs in a named module format (module ids must be contained in the file, not inferred from the file's path).
- `tsc_wrapped`: a TypeScript program which wraps the TypeScript compiler, hosting it under a Bazel worker.
- `tsetse`: a collection of third-party "strictness" checks which we add to the TypeScript compiler.
- `internal/common/*.bzl`: some Starlark utility code for running the `ts_library` rule.

There are no user-facing bits in this repo. These utilities are consumed in https://github.com/bazelbuild/rules_nodejs/tree/master/packages/typescript

Please file issues for `ts_library` rule and other Bazel rules in that repo.

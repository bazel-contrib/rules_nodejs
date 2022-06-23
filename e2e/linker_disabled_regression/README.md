This e2e tests a regression that occurred under the following conditions:

1. Two `yarn_install`s with in a subdirectory.
2. `export_directories_only = False`
3. The linker is disabled with `templated_args = ["--nobazel_run_linker"]`

A binary that depends on an npm package declared in the subdirectory's package.json
could not be resolved.
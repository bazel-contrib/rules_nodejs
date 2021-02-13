<!-- *********************
title: Jasmine
toc: true
nav: rule
********************* -->
# Jasmine rules for Bazel

The Jasmine rules run tests under the Jasmine framework with Bazel.

## Installation

Add the `@bazel/jasmine` npm package to your `devDependencies` in `package.json`.



## jasmine_node_test
Runs tests in NodeJS using the Jasmine test runner.

Detailed XML test results are found in the standard `bazel-testlogs`
directory. This may be symlinked in your workspace.
See https://docs.bazel.build/versions/master/output_directories.html

To debug the test, see debugging notes in `nodejs_test`.



#### Attributes


##### .attribute name (required)
Name of the resulting label


##### .attribute srcs
JavaScript source files containing Jasmine specs


##### .attribute data
Runtime dependencies which will be loaded while the test executes


##### .attribute deps
Other targets which produce JavaScript, such as ts_library


##### .attribute expected_exit_code
The expected exit code for the test.


##### .attribute tags
Bazel tags applied to test


##### .attribute config_file
(experimental) label of a file containing Jasmine JSON config.

Note that not all configuration options are honored, and
we expect some strange feature interations.
For example, the filter for which files are instrumented for
code coverage doesn't understand the spec_files setting in the config.

See https://jasmine.github.io/setup/nodejs.html#configuration


##### .attribute jasmine
A label providing the `@bazel/jasmine` npm dependency.


##### .attribute jasmine_entry_point
A label providing the `@bazel/jasmine` entry point.


##### .attribute kwargs
Remaining arguments are passed to the test rule

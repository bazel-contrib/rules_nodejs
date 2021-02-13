<!-- *********************
title: Protractor
toc: true
nav: rule
********************* -->
# Protractor rules for Bazel

The Protractor rules run tests under the Protractor framework with Bazel.

## Installation

Add the `@bazel/protractor` npm package to your `devDependencies` in `package.json`.




## protractor_web_test
Runs a protractor test in a browser.


#### Attributes


##### .attribute name (required)
The name of the test


##### .attribute configuration
Protractor configuration file.


##### .attribute on_prepare
A file with a node.js script to run once before all tests run.
If the script exports a function which returns a promise, protractor
will wait for the promise to resolve before beginning tests.


##### .attribute srcs
JavaScript source files


##### .attribute deps
Other targets which produce JavaScript such as `ts_library`


##### .attribute data
Runtime dependencies


##### .attribute server
Optional server executable target


##### .attribute tags
Standard Bazel tags, this macro adds one for ibazel


##### .attribute peer_deps
List of peer npm deps required by protractor_web_test


##### .attribute protractor_entry_point
A label providing the protractor entry point
Default to `:node_modules/protractor/bin/protractor`.


##### .attribute kwargs
passed through to `protractor_web_test`


## protractor_web_test_suite
Defines a test_suite of web_test targets that wrap a protractor_web_test target.


#### Attributes


##### .attribute name (required)
The base name of the test


##### .attribute browsers
A sequence of labels specifying the browsers to use.


##### .attribute web_test_data
Data dependencies for the wrapper web_test targets.


##### .attribute wrapped_test_tags
A list of test tag strings to use for the wrapped
karma_web_test target.


##### .attribute kwargs
Arguments for the wrapped karma_web_test target.

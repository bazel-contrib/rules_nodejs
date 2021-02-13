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

**USAGE**

<pre>
protractor_web_test(<a href="#protractor_web_test-name">name</a>, <a href="#protractor_web_test-configuration">configuration</a>, <a href="#protractor_web_test-on_prepare">on_prepare</a>, <a href="#protractor_web_test-srcs">srcs</a>, <a href="#protractor_web_test-deps">deps</a>, <a href="#protractor_web_test-data">data</a>, <a href="#protractor_web_test-server">server</a>, <a href="#protractor_web_test-tags">tags</a>, <a href="#protractor_web_test-peer_deps">peer_deps</a>,
                    <a href="#protractor_web_test-protractor_entry_point">protractor_entry_point</a>, <a href="#protractor_web_test-kwargs">kwargs</a>)
</pre>

Runs a protractor test in a browser.

**PARAMETERS**


<h4 id="protractor_web_test-name">name</h4>

The name of the test



<h4 id="protractor_web_test-configuration">configuration</h4>

Protractor configuration file.

Defaults to `None`

<h4 id="protractor_web_test-on_prepare">on_prepare</h4>

A file with a node.js script to run once before all tests run.
If the script exports a function which returns a promise, protractor
will wait for the promise to resolve before beginning tests.

Defaults to `None`

<h4 id="protractor_web_test-srcs">srcs</h4>

JavaScript source files

Defaults to `[]`

<h4 id="protractor_web_test-deps">deps</h4>

Other targets which produce JavaScript such as `ts_library`

Defaults to `[]`

<h4 id="protractor_web_test-data">data</h4>

Runtime dependencies

Defaults to `[]`

<h4 id="protractor_web_test-server">server</h4>

Optional server executable target

Defaults to `None`

<h4 id="protractor_web_test-tags">tags</h4>

Standard Bazel tags, this macro adds one for ibazel

Defaults to `[]`

<h4 id="protractor_web_test-peer_deps">peer_deps</h4>

List of peer npm deps required by protractor_web_test

Defaults to `["@npm//@bazel/protractor", "@npm//protractor"]`

<h4 id="protractor_web_test-protractor_entry_point">protractor_entry_point</h4>

A label providing the protractor entry point
Default to `:node_modules/protractor/bin/protractor`.

Defaults to `"@npm//:node_modules/protractor/bin/protractor"`

<h4 id="protractor_web_test-kwargs">kwargs</h4>

passed through to `protractor_web_test`





## protractor_web_test_suite

**USAGE**

<pre>
protractor_web_test_suite(<a href="#protractor_web_test_suite-name">name</a>, <a href="#protractor_web_test_suite-browsers">browsers</a>, <a href="#protractor_web_test_suite-web_test_data">web_test_data</a>, <a href="#protractor_web_test_suite-wrapped_test_tags">wrapped_test_tags</a>, <a href="#protractor_web_test_suite-kwargs">kwargs</a>)
</pre>

Defines a test_suite of web_test targets that wrap a protractor_web_test target.

**PARAMETERS**


<h4 id="protractor_web_test_suite-name">name</h4>

The base name of the test



<h4 id="protractor_web_test_suite-browsers">browsers</h4>

A sequence of labels specifying the browsers to use.

Defaults to `None`

<h4 id="protractor_web_test_suite-web_test_data">web_test_data</h4>

Data dependencies for the wrapper web_test targets.

Defaults to `[]`

<h4 id="protractor_web_test_suite-wrapped_test_tags">wrapped_test_tags</h4>

A list of test tag strings to use for the wrapped
karma_web_test target.

Defaults to `["manual", "noci"]`

<h4 id="protractor_web_test_suite-kwargs">kwargs</h4>

Arguments for the wrapped karma_web_test target.





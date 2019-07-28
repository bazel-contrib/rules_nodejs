---
title: Jasmine
layout: home
stylesheet: docs
---
# Jasmine rules for Bazel

**WARNING: this is beta-quality software. Breaking changes are likely. Not recommended for production use without expert support.**

The Jasmine rules run tests under the Jasmine framework with Bazel.


## Installation

Add the `@bazel/jasmine` npm package to your `devDependencies` in `package.json`.

Your `WORKSPACE` should declare a `yarn_install` or `npm_install` rule named `npm`.
It should then install the rules found in the npm packages using the `install_bazel_dependencies' function.
See https://github.com/bazelbuild/rules_nodejs/#quickstart

This causes the `@bazel/jasmine` package to be installed as a Bazel workspace named `npm_bazel_jasmine`.

<!-- Generated with Stardoc: http://skydoc.bazel.build -->

<a name="#jasmine_node_test"></a>


## jasmine_node_test

<pre>
jasmine_node_test(<a href="#jasmine_node_test-name">name</a>, <a href="#jasmine_node_test-srcs">srcs</a>, <a href="#jasmine_node_test-data">data</a>, <a href="#jasmine_node_test-deps">deps</a>, <a href="#jasmine_node_test-expected_exit_code">expected_exit_code</a>, <a href="#jasmine_node_test-tags">tags</a>, <a href="#jasmine_node_test-coverage">coverage</a>, <a href="#jasmine_node_test-jasmine">jasmine</a>, <a href="#jasmine_node_test-jasmine_entry_point">jasmine_entry_point</a>, <a href="#jasmine_node_test-kwargs">kwargs</a>)
</pre>

Runs tests in NodeJS using the Jasmine test runner.

To debug the test, see debugging notes in `nodejs_test`.



### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="jasmine_node_test-name">
      <td><code>name</code></td>
      <td>
        required.
        <p>
          Name of the resulting label
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-srcs">
      <td><code>srcs</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          JavaScript source files containing Jasmine specs
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-data">
      <td><code>data</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Runtime dependencies which will be loaded while the test executes
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-deps">
      <td><code>deps</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Other targets which produce JavaScript, such as ts_library
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-expected_exit_code">
      <td><code>expected_exit_code</code></td>
      <td>
        optional. default is <code>0</code>
        <p>
          The expected exit code for the test. Defaults to 0.
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-tags">
      <td><code>tags</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Bazel tags applied to test
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-coverage">
      <td><code>coverage</code></td>
      <td>
        optional. default is <code>False</code>
        <p>
          Enables code coverage collection and reporting. Defaults to False.
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-jasmine">
      <td><code>jasmine</code></td>
      <td>
        optional. default is <code>"@npm//@bazel/jasmine"</code>
        <p>
          A label providing the @bazel/jasmine npm dependency.
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-jasmine_entry_point">
      <td><code>jasmine_entry_point</code></td>
      <td>
        optional. default is <code>"@npm//:node_modules/@bazel/jasmine/jasmine_runner.js"</code>
        <p>
          A label providing the @bazel/jasmine entry point.
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-kwargs">
      <td><code>kwargs</code></td>
      <td>
        optional.
        <p>
          Remaining arguments are passed to the test rule
        </p>
      </td>
    </tr>
  </tbody>
</table>



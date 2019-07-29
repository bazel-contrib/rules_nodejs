---
title: Protractor
layout: home
stylesheet: docs
---
# Protractor rules for Bazel

**WARNING: this is beta-quality software. Breaking changes are likely. Not recommended for production use without expert support.**

The Protractor rules run tests under the Protractor framework with Bazel.


## Installation

Add the `@bazel/protractor` npm package to your `devDependencies` in `package.json`.

Your `WORKSPACE` should declare a `yarn_install` or `npm_install` rule named `npm`.
It should then install the rules found in the npm packages using the `install_bazel_dependencies' function.
See https://github.com/bazelbuild/rules_nodejs/#quickstart

This causes the `@bazel/protractor` package to be installed as a Bazel workspace named `npm_bazel_protractor`.

<!-- Generated with Stardoc: http://skydoc.bazel.build -->

<a name="#protractor_web_test"></a>


## protractor_web_test

<pre>
protractor_web_test(<a href="#protractor_web_test-name">name</a>, <a href="#protractor_web_test-configuration">configuration</a>, <a href="#protractor_web_test-on_prepare">on_prepare</a>, <a href="#protractor_web_test-srcs">srcs</a>, <a href="#protractor_web_test-deps">deps</a>, <a href="#protractor_web_test-data">data</a>, <a href="#protractor_web_test-server">server</a>, <a href="#protractor_web_test-tags">tags</a>, <a href="#protractor_web_test-protractor">protractor</a>, <a href="#protractor_web_test-protractor_entry_point">protractor_entry_point</a>, <a href="#protractor_web_test-kwargs">kwargs</a>)
</pre>

Runs a protractor test in a browser.


### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="protractor_web_test-name">
      <td><code>name</code></td>
      <td>
        required.
        <p>
          The name of the test
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test-configuration">
      <td><code>configuration</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          Protractor configuration file.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test-on_prepare">
      <td><code>on_prepare</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A file with a node.js script to run once before all tests run.
    If the script exports a function which returns a promise, protractor
    will wait for the promise to resolve before beginning tests.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test-srcs">
      <td><code>srcs</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          JavaScript source files
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test-deps">
      <td><code>deps</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Other targets which produce JavaScript such as `ts_library`
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test-data">
      <td><code>data</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Runtime dependencies
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test-server">
      <td><code>server</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          Optional server executable target
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test-tags">
      <td><code>tags</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Standard Bazel tags, this macro adds one for ibazel
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test-protractor">
      <td><code>protractor</code></td>
      <td>
        optional. default is <code>"@npm//@bazel/protractor"</code>
        <p>
          A label providing the @bazel/protractor npm dependency.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test-protractor_entry_point">
      <td><code>protractor_entry_point</code></td>
      <td>
        optional. default is <code>"@npm//:node_modules/@bazel/protractor/protractor.js"</code>
        <p>
          A label providing the @bazel/protractor entry point.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test-kwargs">
      <td><code>kwargs</code></td>
      <td>
        optional.
        <p>
          passed through to `_protractor_web_test`
        </p>
      </td>
    </tr>
  </tbody>
</table>

<a name="#protractor_web_test_suite"></a>


## protractor_web_test_suite

<pre>
protractor_web_test_suite(<a href="#protractor_web_test_suite-name">name</a>, <a href="#protractor_web_test_suite-configuration">configuration</a>, <a href="#protractor_web_test_suite-on_prepare">on_prepare</a>, <a href="#protractor_web_test_suite-srcs">srcs</a>, <a href="#protractor_web_test_suite-deps">deps</a>, <a href="#protractor_web_test_suite-data">data</a>, <a href="#protractor_web_test_suite-server">server</a>, <a href="#protractor_web_test_suite-browsers">browsers</a>, <a href="#protractor_web_test_suite-args">args</a>, <a href="#protractor_web_test_suite-browser_overrides">browser_overrides</a>, <a href="#protractor_web_test_suite-config">config</a>, <a href="#protractor_web_test_suite-flaky">flaky</a>, <a href="#protractor_web_test_suite-local">local</a>, <a href="#protractor_web_test_suite-shard_count">shard_count</a>, <a href="#protractor_web_test_suite-size">size</a>, <a href="#protractor_web_test_suite-tags">tags</a>, <a href="#protractor_web_test_suite-test_suite_tags">test_suite_tags</a>, <a href="#protractor_web_test_suite-timeout">timeout</a>, <a href="#protractor_web_test_suite-visibility">visibility</a>, <a href="#protractor_web_test_suite-web_test_data">web_test_data</a>, <a href="#protractor_web_test_suite-wrapped_test_tags">wrapped_test_tags</a>, <a href="#protractor_web_test_suite-protractor">protractor</a>, <a href="#protractor_web_test_suite-protractor_entry_point">protractor_entry_point</a>, <a href="#protractor_web_test_suite-remaining_keyword_args">remaining_keyword_args</a>)
</pre>

Defines a test_suite of web_test targets that wrap a protractor_web_test target.


### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="protractor_web_test_suite-name">
      <td><code>name</code></td>
      <td>
        required.
        <p>
          The base name of the test.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-configuration">
      <td><code>configuration</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          Protractor configuration file.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-on_prepare">
      <td><code>on_prepare</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A file with a node.js script to run once before all tests run.
    If the script exports a function which returns a promise, protractor
    will wait for the promise to resolve before beginning tests.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-srcs">
      <td><code>srcs</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          JavaScript source files
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-deps">
      <td><code>deps</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Other targets which produce JavaScript such as `ts_library`
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-data">
      <td><code>data</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Runtime dependencies
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-server">
      <td><code>server</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          Optional server executable target
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-browsers">
      <td><code>browsers</code></td>
      <td>
        optional. default is <code>["@io_bazel_rules_webtesting//browsers:chromium-local"]</code>
        <p>
          A sequence of labels specifying the browsers to use.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-args">
      <td><code>args</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          Args for web_test targets generated by this extension.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-browser_overrides">
      <td><code>browser_overrides</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          Dictionary; optional; default is an empty dictionary. A
  dictionary mapping from browser names to browser-specific web_test
  attributes, such as shard_count, flakiness, timeout, etc. For example:
  {'//browsers:chrome-native': {'shard_count': 3, 'flaky': 1}
   '//browsers:firefox-native': {'shard_count': 1, 'timeout': 100}}.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-config">
      <td><code>config</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          Label; optional; Configuration of web test features.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-flaky">
      <td><code>flaky</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A boolean specifying that the test is flaky. If set, the test will
  be retried up to 3 times (default: 0)
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-local">
      <td><code>local</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          boolean; optional.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-shard_count">
      <td><code>shard_count</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          The number of test shards to use per browser. (default: 1)
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-size">
      <td><code>size</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A string specifying the test size. (default: 'large')
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-tags">
      <td><code>tags</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          A list of test tag strings to apply to each generated web_test target.
  This macro adds a couple for ibazel.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-test_suite_tags">
      <td><code>test_suite_tags</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A list of tag strings for the generated test_suite.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-timeout">
      <td><code>timeout</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A string specifying the test timeout (default: computed from size)
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-visibility">
      <td><code>visibility</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          List of labels; optional.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-web_test_data">
      <td><code>web_test_data</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Data dependencies for the web_test.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-wrapped_test_tags">
      <td><code>wrapped_test_tags</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A list of test tag strings to use for the wrapped test
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-protractor">
      <td><code>protractor</code></td>
      <td>
        optional. default is <code>"@npm//@bazel/protractor"</code>
        <p>
          Protractor entry_point. Defaults to @npm//:node_modules/protractor/bin/protractor
    but should be changed to @your_npm_workspace//:node_modules/protractor/bin/protractor if
    you are not using @npm for your npm dependencies.
        </p>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-protractor_entry_point">
      <td><code>protractor_entry_point</code></td>
      <td>
        optional. default is <code>"@npm//:node_modules/@bazel/protractor/protractor.js"</code>
      </td>
    </tr>
    <tr id="protractor_web_test_suite-remaining_keyword_args">
      <td><code>remaining_keyword_args</code></td>
      <td>
        optional.
        <p>
          Arguments for the wrapped test target.
        </p>
      </td>
    </tr>
  </tbody>
</table>


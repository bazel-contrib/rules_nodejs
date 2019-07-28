---
title: Karma
layout: home
stylesheet: docs
---
# Karma rules for Bazel

**WARNING: this is beta-quality software. Breaking changes are likely. Not recommended for production use without expert support.**

The Karma rules run karma tests with Bazel.


## Installation

Add the `@bazel/karma` npm package to your `devDependencies` in `package.json`.

Your `WORKSPACE` should declare a `yarn_install` or `npm_install` rule named `npm`.
It should then install the rules found in the npm packages using the `install_bazel_dependencies' function.
See https://github.com/bazelbuild/rules_nodejs/#quickstart

This causes the `@bazel/karma` package to be installed as a Bazel workspace named `npm_bazel_karma`.

Now add this to your `WORKSPACE` to install the Karma dependencies:

```python
# Fetch transitive Bazel dependencies of npm_bazel_karma
load("@npm_bazel_karma//:package.bzl", "rules_karma_dependencies")
rules_karma_dependencies()
```

This installs the `io_bazel_rules_webtesting` repository, if you haven't installed it earlier.

Finally, configure the rules_webtesting:

```python
# Setup web testing, choose browsers we can test on
load("@io_bazel_rules_webtesting//web:repositories.bzl", "browser_repositories", "web_test_repositories")

web_test_repositories()
browser_repositories(
    chromium = True,
)
```


## Installing with self-managed dependencies

If you didn't use the `yarn_install` or `npm_install` rule to create an `npm` workspace, you'll have to declare a rule in your root `BUILD.bazel` file to execute karma:

```python
# Create a karma rule to use in ts_web_test_suite karma
# attribute when using self-managed dependencies
nodejs_binary(
    name = "karma/karma",
    entry_point = "//:node_modules/karma/bin/karma",
    # Point bazel to your node_modules to find the entry point
    node_modules = ["//:node_modules"],
)
```

<!-- Generated with Stardoc: http://skydoc.bazel.build -->

<a name="#karma_web_test"></a>


## karma_web_test

<pre>
karma_web_test(<a href="#karma_web_test-srcs">srcs</a>, <a href="#karma_web_test-deps">deps</a>, <a href="#karma_web_test-data">data</a>, <a href="#karma_web_test-configuration_env_vars">configuration_env_vars</a>, <a href="#karma_web_test-bootstrap">bootstrap</a>, <a href="#karma_web_test-runtime_deps">runtime_deps</a>, <a href="#karma_web_test-static_files">static_files</a>, <a href="#karma_web_test-config_file">config_file</a>, <a href="#karma_web_test-tags">tags</a>, <a href="#karma_web_test-kwargs">kwargs</a>)
</pre>

Runs unit tests in a browser with Karma.

When executed under `bazel test`, this uses a headless browser for speed.
This is also because `bazel test` allows multiple targets to be tested together,
and we don't want to open a Chrome window on your machine for each one. Also,
under `bazel test` the test will execute and immediately terminate.

Running under `ibazel test` gives you a "watch mode" for your tests. The rule is
optimized for this case - the test runner server will stay running and just
re-serve the up-to-date JavaScript source bundle.

To debug a single test target, run it with `bazel run` instead. This will open a
browser window on your computer. Also you can use any other browser by opening
the URL printed when the test starts up. The test will remain running until you
cancel the `bazel run` command.

This rule will use your system Chrome by default. In the default case, your
environment must specify CHROME_BIN so that the rule will know which Chrome binary to run.
Other `browsers` and `customLaunchers` may be set using the a base Karma configuration
specified in the `config_file` attribute.



### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="karma_web_test-srcs">
      <td><code>srcs</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          A list of JavaScript test files
        </p>
      </td>
    </tr>
    <tr id="karma_web_test-deps">
      <td><code>deps</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Other targets which produce JavaScript such as `ts_library`
        </p>
      </td>
    </tr>
    <tr id="karma_web_test-data">
      <td><code>data</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Runtime dependencies
        </p>
      </td>
    </tr>
    <tr id="karma_web_test-configuration_env_vars">
      <td><code>configuration_env_vars</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Pass these configuration environment variables to the resulting binary.
    Chooses a subset of the configuration environment variables (taken from ctx.var), which also
    includes anything specified via the --define flag.
    Note, this can lead to different outputs produced by this rule.
        </p>
      </td>
    </tr>
    <tr id="karma_web_test-bootstrap">
      <td><code>bootstrap</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          JavaScript files to include *before* the module loader (require.js).
    For example, you can include Reflect,js for TypeScript decorator metadata reflection,
    or UMD bundles for third-party libraries.
        </p>
      </td>
    </tr>
    <tr id="karma_web_test-runtime_deps">
      <td><code>runtime_deps</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Dependencies which should be loaded after the module loader but before the srcs and deps.
    These should be a list of targets which produce JavaScript such as `ts_library`.
    The files will be loaded in the same order they are declared by that rule.
        </p>
      </td>
    </tr>
    <tr id="karma_web_test-static_files">
      <td><code>static_files</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Arbitrary files which are available to be served on request.
    Files are served at:
    `/base/<WORKSPACE_NAME>/<path-to-file>`, e.g.
    `/base/npm_bazel_typescript/examples/testing/static_script.js`
        </p>
      </td>
    </tr>
    <tr id="karma_web_test-config_file">
      <td><code>config_file</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          User supplied Karma configuration file. Bazel will override
    certain attributes of this configuration file. Attributes that are
    overridden will be outputted to the test log.
        </p>
      </td>
    </tr>
    <tr id="karma_web_test-tags">
      <td><code>tags</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Standard Bazel tags, this macro adds tags for ibazel support
        </p>
      </td>
    </tr>
    <tr id="karma_web_test-kwargs">
      <td><code>kwargs</code></td>
      <td>
        optional.
        <p>
          Passed through to `karma_web_test`
        </p>
      </td>
    </tr>
  </tbody>
</table>


<a name="#karma_web_test_suite"></a>


## karma_web_test_suite

<pre>
karma_web_test_suite(<a href="#karma_web_test_suite-name">name</a>, <a href="#karma_web_test_suite-browsers">browsers</a>, <a href="#karma_web_test_suite-args">args</a>, <a href="#karma_web_test_suite-browser_overrides">browser_overrides</a>, <a href="#karma_web_test_suite-config">config</a>, <a href="#karma_web_test_suite-flaky">flaky</a>, <a href="#karma_web_test_suite-local">local</a>, <a href="#karma_web_test_suite-shard_count">shard_count</a>, <a href="#karma_web_test_suite-size">size</a>, <a href="#karma_web_test_suite-tags">tags</a>, <a href="#karma_web_test_suite-test_suite_tags">test_suite_tags</a>, <a href="#karma_web_test_suite-timeout">timeout</a>, <a href="#karma_web_test_suite-visibility">visibility</a>, <a href="#karma_web_test_suite-web_test_data">web_test_data</a>, <a href="#karma_web_test_suite-wrapped_test_tags">wrapped_test_tags</a>, <a href="#karma_web_test_suite-remaining_keyword_args">remaining_keyword_args</a>)
</pre>

Defines a test_suite of web_test targets that wrap a karma_web_test target.

This macro also accepts all parameters in karma_web_test. See karma_web_test docs
for details.



### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="karma_web_test_suite-name">
      <td><code>name</code></td>
      <td>
        required.
        <p>
          The base name of the test
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-browsers">
      <td><code>browsers</code></td>
      <td>
        optional. default is <code>["@io_bazel_rules_webtesting//browsers:chromium-local"]</code>
        <p>
          A sequence of labels specifying the browsers to use.
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-args">
      <td><code>args</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          Args for web_test targets generated by this extension.
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-browser_overrides">
      <td><code>browser_overrides</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          Dictionary; optional; default is an empty dictionary. A
  dictionary mapping from browser names to browser-specific web_test
  attributes, such as shard_count, flakiness, timeout, etc. For example:
  ```
  {
      '//browsers:chrome-native': {'shard_count': 3, 'flaky': 1},
      '//browsers:firefox-native': {'shard_count': 1, 'timeout': 100},
  }
  ```
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-config">
      <td><code>config</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          Label; optional; Configuration of web test features.
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-flaky">
      <td><code>flaky</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A boolean specifying that the test is flaky. If set, the test will
  be retried up to 3 times (default: 0)
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-local">
      <td><code>local</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          boolean; optional.
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-shard_count">
      <td><code>shard_count</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          The number of test shards to use per browser. (default: 1)
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-size">
      <td><code>size</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A string specifying the test size. (default: 'large')
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-tags">
      <td><code>tags</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          A list of test tag strings to apply to each generated web_test target.
  This macro adds a couple for ibazel.
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-test_suite_tags">
      <td><code>test_suite_tags</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A list of tag strings for the generated test_suite.
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-timeout">
      <td><code>timeout</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A string specifying the test timeout (default: computed from size)
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-visibility">
      <td><code>visibility</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          List of labels; optional.
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-web_test_data">
      <td><code>web_test_data</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Data dependencies for the web_test.
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-wrapped_test_tags">
      <td><code>wrapped_test_tags</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A list of test tag strings to use for the wrapped test
        </p>
      </td>
    </tr>
    <tr id="karma_web_test_suite-remaining_keyword_args">
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


<a name="#ts_web_test"></a>


## ts_web_test

<pre>
ts_web_test(<a href="#ts_web_test-srcs">srcs</a>, <a href="#ts_web_test-deps">deps</a>, <a href="#ts_web_test-data">data</a>, <a href="#ts_web_test-configuration_env_vars">configuration_env_vars</a>, <a href="#ts_web_test-bootstrap">bootstrap</a>, <a href="#ts_web_test-runtime_deps">runtime_deps</a>, <a href="#ts_web_test-static_files">static_files</a>, <a href="#ts_web_test-tags">tags</a>, <a href="#ts_web_test-kwargs">kwargs</a>)
</pre>

Runs unit tests in a browser.

When executed under `bazel test`, this uses a headless browser for speed.
This is also because `bazel test` allows multiple targets to be tested together,
and we don't want to open a Chrome window on your machine for each one. Also,
under `bazel test` the test will execute and immediately terminate.

Running under `ibazel test` gives you a "watch mode" for your tests. The rule is
optimized for this case - the test runner server will stay running and just
re-serve the up-to-date JavaScript source bundle.

To debug a single test target, run it with `bazel run` instead. This will open a
browser window on your computer. Also you can use any other browser by opening
the URL printed when the test starts up. The test will remain running until you
cancel the `bazel run` command.

This rule will use your system Chrome. Your environment must specify CHROME_BIN
so that the rule will know which Chrome binary to run.

Currently this rule uses Karma as the test runner under the hood, but this is
an implementation detail. We might switch to another runner like Jest in the future.



### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="ts_web_test-srcs">
      <td><code>srcs</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          A list of JavaScript test files
        </p>
      </td>
    </tr>
    <tr id="ts_web_test-deps">
      <td><code>deps</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Other targets which produce JavaScript such as `ts_library`
        </p>
      </td>
    </tr>
    <tr id="ts_web_test-data">
      <td><code>data</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Runtime dependencies
        </p>
      </td>
    </tr>
    <tr id="ts_web_test-configuration_env_vars">
      <td><code>configuration_env_vars</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Pass these configuration environment variables to the resulting binary.
    Chooses a subset of the configuration environment variables (taken from ctx.var), which also
    includes anything specified via the --define flag.
    Note, this can lead to different outputs produced by this rule.
        </p>
      </td>
    </tr>
    <tr id="ts_web_test-bootstrap">
      <td><code>bootstrap</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          JavaScript files to include *before* the module loader (require.js).
    For example, you can include Reflect,js for TypeScript decorator metadata reflection,
    or UMD bundles for third-party libraries.
        </p>
      </td>
    </tr>
    <tr id="ts_web_test-runtime_deps">
      <td><code>runtime_deps</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Dependencies which should be loaded after the module loader but before the srcs and deps.
    These should be a list of targets which produce JavaScript such as `ts_library`.
    The files will be loaded in the same order they are declared by that rule.
        </p>
      </td>
    </tr>
    <tr id="ts_web_test-static_files">
      <td><code>static_files</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Arbitrary files which are available to be served on request.
    Files are served at:
    `/base/<WORKSPACE_NAME>/<path-to-file>`, e.g.
    `/base/npm_bazel_typescript/examples/testing/static_script.js`
        </p>
      </td>
    </tr>
    <tr id="ts_web_test-tags">
      <td><code>tags</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Standard Bazel tags, this macro adds tags for ibazel support as well as
    `browser:chromium-system` to allow for filtering on systems with no
    system Chrome.
        </p>
      </td>
    </tr>
    <tr id="ts_web_test-kwargs">
      <td><code>kwargs</code></td>
      <td>
        optional.
        <p>
          Passed through to `ts_web_test`
        </p>
      </td>
    </tr>
  </tbody>
</table>


<a name="#ts_web_test_suite"></a>


## ts_web_test_suite

<pre>
ts_web_test_suite(<a href="#ts_web_test_suite-name">name</a>, <a href="#ts_web_test_suite-browsers">browsers</a>, <a href="#ts_web_test_suite-args">args</a>, <a href="#ts_web_test_suite-browser_overrides">browser_overrides</a>, <a href="#ts_web_test_suite-config">config</a>, <a href="#ts_web_test_suite-flaky">flaky</a>, <a href="#ts_web_test_suite-local">local</a>, <a href="#ts_web_test_suite-shard_count">shard_count</a>, <a href="#ts_web_test_suite-size">size</a>, <a href="#ts_web_test_suite-tags">tags</a>, <a href="#ts_web_test_suite-test_suite_tags">test_suite_tags</a>, <a href="#ts_web_test_suite-timeout">timeout</a>, <a href="#ts_web_test_suite-visibility">visibility</a>, <a href="#ts_web_test_suite-web_test_data">web_test_data</a>, <a href="#ts_web_test_suite-wrapped_test_tags">wrapped_test_tags</a>, <a href="#ts_web_test_suite-remaining_keyword_args">remaining_keyword_args</a>)
</pre>

Defines a test_suite of web_test targets that wrap a ts_web_test target.

This macro also accepts all parameters in ts_web_test. See ts_web_test docs for
details.



### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="ts_web_test_suite-name">
      <td><code>name</code></td>
      <td>
        required.
        <p>
          The base name of the test.
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-browsers">
      <td><code>browsers</code></td>
      <td>
        optional. default is <code>["@io_bazel_rules_webtesting//browsers:chromium-local"]</code>
        <p>
          A sequence of labels specifying the browsers to use.
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-args">
      <td><code>args</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          Args for web_test targets generated by this extension.
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-browser_overrides">
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
    <tr id="ts_web_test_suite-config">
      <td><code>config</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          Label; optional; Configuration of web test features.
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-flaky">
      <td><code>flaky</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A boolean specifying that the test is flaky. If set, the test will
  be retried up to 3 times (default: 0)
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-local">
      <td><code>local</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          boolean; optional.
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-shard_count">
      <td><code>shard_count</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          The number of test shards to use per browser. (default: 1)
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-size">
      <td><code>size</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A string specifying the test size. (default: 'large')
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-tags">
      <td><code>tags</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          A list of test tag strings to apply to each generated web_test_suite target.
  This macro adds a couple for ibazel.
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-test_suite_tags">
      <td><code>test_suite_tags</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A list of tag strings for the generated test_suite.
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-timeout">
      <td><code>timeout</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A string specifying the test timeout (default: computed from size)
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-visibility">
      <td><code>visibility</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          List of labels; optional.
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-web_test_data">
      <td><code>web_test_data</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Data dependencies for the web_test_suite.
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-wrapped_test_tags">
      <td><code>wrapped_test_tags</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          A list of test tag strings to use for the wrapped test
        </p>
      </td>
    </tr>
    <tr id="ts_web_test_suite-remaining_keyword_args">
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



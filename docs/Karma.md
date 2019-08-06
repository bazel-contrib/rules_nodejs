---
title: Karma
layout: default
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
# Set up web testing, choose browsers we can test on
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

[name]: https://bazel.build/docs/build-ref.html#name
[label]: https://bazel.build/docs/build-ref.html#labels
[labels]: https://bazel.build/docs/build-ref.html#labels


## karma_web_test

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



### Usage

```
karma_web_test(srcs, deps, data, configuration_env_vars, bootstrap, runtime_deps, static_files, config_file, tags, kwargs)
```



#### `srcs`
      
A list of JavaScript test files

Defaults to `[]`



#### `deps`
      
Other targets which produce JavaScript such as `ts_library`

Defaults to `[]`



#### `data`
      
Runtime dependencies

Defaults to `[]`



#### `configuration_env_vars`
      
Pass these configuration environment variables to the resulting binary.
    Chooses a subset of the configuration environment variables (taken from ctx.var), which also
    includes anything specified via the --define flag.
    Note, this can lead to different outputs produced by this rule.

Defaults to `[]`



#### `bootstrap`
      
JavaScript files to include *before* the module loader (require.js).
    For example, you can include Reflect,js for TypeScript decorator metadata reflection,
    or UMD bundles for third-party libraries.

Defaults to `[]`



#### `runtime_deps`
      
Dependencies which should be loaded after the module loader but before the srcs and deps.
    These should be a list of targets which produce JavaScript such as `ts_library`.
    The files will be loaded in the same order they are declared by that rule.

Defaults to `[]`



#### `static_files`
      
Arbitrary files which are available to be served on request.
    Files are served at:
    `/base/<WORKSPACE_NAME>/<path-to-file>`, e.g.
    `/base/npm_bazel_typescript/examples/testing/static_script.js`

Defaults to `[]`



#### `config_file`
      
User supplied Karma configuration file. Bazel will override
    certain attributes of this configuration file. Attributes that are
    overridden will be outputted to the test log.

Defaults to `None`



#### `tags`
      
Standard Bazel tags, this macro adds tags for ibazel support

Defaults to `[]`



#### `kwargs`
      
Passed through to `karma_web_test`






## karma_web_test_suite

Defines a test_suite of web_test targets that wrap a karma_web_test target.

This macro also accepts all parameters in karma_web_test. See karma_web_test docs
for details.



### Usage

```
karma_web_test_suite(name, browsers, args, browser_overrides, config, flaky, local, shard_count, size, tags, test_suite_tags, timeout, visibility, web_test_data, wrapped_test_tags, remaining_keyword_args)
```



#### `name`
      
The base name of the test




#### `browsers`
      
A sequence of labels specifying the browsers to use.

Defaults to `["@io_bazel_rules_webtesting//browsers:chromium-local"]`



#### `args`
      
Args for web_test targets generated by this extension.

Defaults to `None`



#### `browser_overrides`
      
Dictionary; optional; default is an empty dictionary. A
  dictionary mapping from browser names to browser-specific web_test
  attributes, such as shard_count, flakiness, timeout, etc. For example:
  ```
  {
      '//browsers:chrome-native': {'shard_count': 3, 'flaky': 1},
      '//browsers:firefox-native': {'shard_count': 1, 'timeout': 100},
  }
  ```

Defaults to `None`



#### `config`
      
Label; optional; Configuration of web test features.

Defaults to `None`



#### `flaky`
      
A boolean specifying that the test is flaky. If set, the test will
  be retried up to 3 times (default: 0)

Defaults to `None`



#### `local`
      
boolean; optional.

Defaults to `None`



#### `shard_count`
      
The number of test shards to use per browser. (default: 1)

Defaults to `None`



#### `size`
      
A string specifying the test size. (default: 'large')

Defaults to `None`



#### `tags`
      
A list of test tag strings to apply to each generated web_test target.
  This macro adds a couple for ibazel.

Defaults to `[]`



#### `test_suite_tags`
      
A list of tag strings for the generated test_suite.

Defaults to `None`



#### `timeout`
      
A string specifying the test timeout (default: computed from size)

Defaults to `None`



#### `visibility`
      
List of labels; optional.

Defaults to `None`



#### `web_test_data`
      
Data dependencies for the web_test.

Defaults to `[]`



#### `wrapped_test_tags`
      
A list of test tag strings to use for the wrapped test

Defaults to `None`



#### `remaining_keyword_args`
      
Arguments for the wrapped test target.






## ts_web_test

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



### Usage

```
ts_web_test(srcs, deps, data, configuration_env_vars, bootstrap, runtime_deps, static_files, tags, kwargs)
```



#### `srcs`
      
A list of JavaScript test files

Defaults to `[]`



#### `deps`
      
Other targets which produce JavaScript such as `ts_library`

Defaults to `[]`



#### `data`
      
Runtime dependencies

Defaults to `[]`



#### `configuration_env_vars`
      
Pass these configuration environment variables to the resulting binary.
    Chooses a subset of the configuration environment variables (taken from ctx.var), which also
    includes anything specified via the --define flag.
    Note, this can lead to different outputs produced by this rule.

Defaults to `[]`



#### `bootstrap`
      
JavaScript files to include *before* the module loader (require.js).
    For example, you can include Reflect,js for TypeScript decorator metadata reflection,
    or UMD bundles for third-party libraries.

Defaults to `[]`



#### `runtime_deps`
      
Dependencies which should be loaded after the module loader but before the srcs and deps.
    These should be a list of targets which produce JavaScript such as `ts_library`.
    The files will be loaded in the same order they are declared by that rule.

Defaults to `[]`



#### `static_files`
      
Arbitrary files which are available to be served on request.
    Files are served at:
    `/base/<WORKSPACE_NAME>/<path-to-file>`, e.g.
    `/base/npm_bazel_typescript/examples/testing/static_script.js`

Defaults to `[]`



#### `tags`
      
Standard Bazel tags, this macro adds tags for ibazel support as well as
    `browser:chromium-system` to allow for filtering on systems with no
    system Chrome.

Defaults to `[]`



#### `kwargs`
      
Passed through to `ts_web_test`






## ts_web_test_suite

Defines a test_suite of web_test targets that wrap a ts_web_test target.

This macro also accepts all parameters in ts_web_test. See ts_web_test docs for
details.



### Usage

```
ts_web_test_suite(name, browsers, args, browser_overrides, config, flaky, local, shard_count, size, tags, test_suite_tags, timeout, visibility, web_test_data, wrapped_test_tags, remaining_keyword_args)
```



#### `name`
      
The base name of the test.




#### `browsers`
      
A sequence of labels specifying the browsers to use.

Defaults to `["@io_bazel_rules_webtesting//browsers:chromium-local"]`



#### `args`
      
Args for web_test targets generated by this extension.

Defaults to `None`



#### `browser_overrides`
      
Dictionary; optional; default is an empty dictionary. A
  dictionary mapping from browser names to browser-specific web_test
  attributes, such as shard_count, flakiness, timeout, etc. For example:
  {'//browsers:chrome-native': {'shard_count': 3, 'flaky': 1}
   '//browsers:firefox-native': {'shard_count': 1, 'timeout': 100}}.

Defaults to `None`



#### `config`
      
Label; optional; Configuration of web test features.

Defaults to `None`



#### `flaky`
      
A boolean specifying that the test is flaky. If set, the test will
  be retried up to 3 times (default: 0)

Defaults to `None`



#### `local`
      
boolean; optional.

Defaults to `None`



#### `shard_count`
      
The number of test shards to use per browser. (default: 1)

Defaults to `None`



#### `size`
      
A string specifying the test size. (default: 'large')

Defaults to `None`



#### `tags`
      
A list of test tag strings to apply to each generated web_test_suite target.
  This macro adds a couple for ibazel.

Defaults to `[]`



#### `test_suite_tags`
      
A list of tag strings for the generated test_suite.

Defaults to `None`



#### `timeout`
      
A string specifying the test timeout (default: computed from size)

Defaults to `None`



#### `visibility`
      
List of labels; optional.

Defaults to `None`



#### `web_test_data`
      
Data dependencies for the web_test_suite.

Defaults to `[]`



#### `wrapped_test_tags`
      
A list of test tag strings to use for the wrapped test

Defaults to `None`



#### `remaining_keyword_args`
      
Arguments for the wrapped test target.






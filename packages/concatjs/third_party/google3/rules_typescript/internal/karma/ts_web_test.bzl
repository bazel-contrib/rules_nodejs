# Copyright 2017 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"Unit testing in a browser"

load("@io_bazel_rules_webtesting//web/internal:constants.bzl", "DEFAULT_WRAPPED_TEST_TAGS")
load("@io_bazel_rules_webtesting//web:web.bzl", "web_test_suite")
load(":karma_web_test.bzl", "KARMA_GENERIC_WEB_TEST_ATTRS", "run_karma_web_test")

# Using generic karma_web_test attributes under the hood
TS_WEB_TEST_ATTRS = dict(KARMA_GENERIC_WEB_TEST_ATTRS, **{})

def _ts_web_test_impl(ctx):
    # Using karma_web_test under the hood
    runfiles = run_karma_web_test(ctx)

    return [DefaultInfo(
        files = depset([ctx.outputs.executable]),
        runfiles = runfiles,
        executable = ctx.outputs.executable,
    )]

_ts_web_test = rule(
    implementation = _ts_web_test_impl,
    test = True,
    executable = True,
    attrs = TS_WEB_TEST_ATTRS,
)

def ts_web_test(
        srcs = [],
        deps = [],
        data = [],
        configuration_env_vars = [],
        bootstrap = [],
        runtime_deps = [],
        static_files = [],
        tags = [],
        **kwargs):
    """Runs unit tests in a browser.

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

    Args:
      srcs: A list of JavaScript test files
      deps: Other targets which produce JavaScript such as `ts_library`
      data: Runtime dependencies
      configuration_env_vars: Pass these configuration environment variables to the resulting binary.
          Chooses a subset of the configuration environment variables (taken from ctx.var), which also
          includes anything specified via the --define flag.
          Note, this can lead to different outputs produced by this rule.
      bootstrap: JavaScript files to include *before* the module loader (require.js).
          For example, you can include Reflect,js for TypeScript decorator metadata reflection,
          or UMD bundles for third-party libraries.
      runtime_deps: Dependencies which should be loaded after the module loader but before the srcs and deps.
          These should be a list of targets which produce JavaScript such as `ts_library`.
          The files will be loaded in the same order they are declared by that rule.
      static_files: Arbitrary files which are available to be served on request.
          Files are served at:
          `/base/<WORKSPACE_NAME>/<path-to-file>`, e.g.
          `/base/build_bazel_rules_typescript/examples/testing/static_script.js`
      tags: Standard Bazel tags, this macro adds tags for ibazel support as well as
          `browser:chromium-system` to allow for filtering on systems with no
          system Chrome.
      **kwargs: Passed through to `ts_web_test`
    """

    _ts_web_test(
        srcs = srcs,
        deps = deps,
        data = data,
        configuration_env_vars = configuration_env_vars,
        bootstrap = bootstrap,
        runtime_deps = runtime_deps,
        static_files = static_files,
        tags = tags + [
            # Users don't need to know that this tag is required to run under ibazel
            "ibazel_notify_changes",
            # Always attach this label to allow filtering, eg. envs w/ no browser
            "browser:chromium-system",
        ],
        **kwargs
    )

def ts_web_test_suite(
        name,
        browsers = ["@io_bazel_rules_webtesting//browsers:chromium-local"],
        args = None,
        browser_overrides = None,
        config = None,
        flaky = None,
        local = None,
        shard_count = None,
        size = None,
        tags = [],
        test_suite_tags = None,
        timeout = None,
        visibility = None,
        web_test_data = [],
        wrapped_test_tags = None,
        **remaining_keyword_args):
    """Defines a test_suite of web_test targets that wrap a ts_web_test target.

    This macro also accepts all parameters in ts_web_test. See ts_web_test docs for
    details.

    Args:
      name: The base name of the test.
      browsers: A sequence of labels specifying the browsers to use.
      args: Args for web_test targets generated by this extension.
      browser_overrides: Dictionary; optional; default is an empty dictionary. A
        dictionary mapping from browser names to browser-specific web_test
        attributes, such as shard_count, flakiness, timeout, etc. For example:
        {'//browsers:chrome-native': {'shard_count': 3, 'flaky': 1}
         '//browsers:firefox-native': {'shard_count': 1, 'timeout': 100}}.
      config: Label; optional; Configuration of web test features.
      flaky: A boolean specifying that the test is flaky. If set, the test will
        be retried up to 3 times (default: 0)
      local: boolean; optional.
      shard_count: The number of test shards to use per browser. (default: 1)
      size: A string specifying the test size. (default: 'large')
      tags: A list of test tag strings to apply to each generated web_test_suite target.
        This macro adds a couple for ibazel.
      test_suite_tags: A list of tag strings for the generated test_suite.
      timeout: A string specifying the test timeout (default: computed from size)
      visibility: List of labels; optional.
      web_test_data: Data dependencies for the web_test_suite.
      wrapped_test_tags: A list of test tag strings to use for the wrapped test
      **remaining_keyword_args: Arguments for the wrapped test target.
    """

    # Check explicitly for None so that users can set this to the empty list
    if wrapped_test_tags == None:
        wrapped_test_tags = DEFAULT_WRAPPED_TEST_TAGS

    size = size or "large"

    wrapped_test_name = name + "_wrapped_test"

    _ts_web_test(
        name = wrapped_test_name,
        args = args,
        flaky = flaky,
        local = local,
        shard_count = shard_count,
        size = size,
        tags = wrapped_test_tags,
        timeout = timeout,
        visibility = ["//visibility:private"],
        **remaining_keyword_args
    )

    web_test_suite(
        name = name,
        launcher = ":" + wrapped_test_name,
        args = args,
        browsers = browsers,
        browser_overrides = browser_overrides,
        config = config,
        data = web_test_data,
        flaky = flaky,
        local = local,
        shard_count = shard_count,
        size = size,
        tags = tags + [
            # Users don't need to know that this tag is required to run under ibazel
            "ibazel_notify_changes",
        ],
        test = wrapped_test_name,
        test_suite_tags = test_suite_tags,
        timeout = timeout,
        visibility = visibility,
    )

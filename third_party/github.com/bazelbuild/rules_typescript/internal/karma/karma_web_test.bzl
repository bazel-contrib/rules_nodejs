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
"Unit testing with Karma"

load("@build_bazel_rules_nodejs//internal/js_library:js_library.bzl", "write_amd_names_shim")
load(
    "@build_bazel_rules_nodejs//internal:node.bzl",
    "expand_path_into_runfiles",
    "sources_aspect",
)
load("@io_bazel_rules_webtesting//web/internal:constants.bzl", "DEFAULT_WRAPPED_TEST_TAGS")
load("@io_bazel_rules_webtesting//web:web.bzl", "web_test_suite")
load(":web_test.bzl", "COMMON_WEB_TEST_ATTRS")

_CONF_TMPL = "//internal/karma:karma.conf.js"
_DEFAULT_KARMA_BIN = "@npm//@bazel/karma/bin:karma"

# Attributes for karma_web_test that are shared with ts_web_test which
# uses Karma under the hood
KARMA_GENERIC_WEB_TEST_ATTRS = dict(COMMON_WEB_TEST_ATTRS, **{
    "bootstrap": attr.label_list(
        doc = """JavaScript files to include *before* the module loader (require.js).
        For example, you can include Reflect,js for TypeScript decorator metadata reflection,
        or UMD bundles for third-party libraries.""",
        allow_files = [".js"],
    ),
    "karma": attr.label(
        doc = "karma binary label",
        default = Label(_DEFAULT_KARMA_BIN),
        executable = True,
        cfg = "target",
        allow_files = True,
    ),
    "static_files": attr.label_list(
        doc = """Arbitrary files which are available to be served on request.
        Files are served at:
        `/base/<WORKSPACE_NAME>/<path-to-file>`, e.g.
        `/base/build_bazel_rules_typescript/examples/testing/static_script.js`""",
        allow_files = True,
    ),
    "runtime_deps": attr.label_list(
        doc = """Dependencies which should be loaded after the module loader but before the srcs and deps.
        These should be a list of targets which produce JavaScript such as `ts_library`.
        The files will be loaded in the same order they are declared by that rule.""",
        allow_files = True,
        aspects = [sources_aspect],
    ),
    "_conf_tmpl": attr.label(
        default = Label(_CONF_TMPL),
        allow_single_file = True,
    ),
})

# Attributes for karma_web_test that are specific to karma_web_test
KARMA_WEB_TEST_ATTRS = dict(KARMA_GENERIC_WEB_TEST_ATTRS, **{
    "config_file": attr.label(
        doc = """User supplied Karma configuration file. Bazel will override
        certain attributes of this configuration file. Attributes that are
        overridden will be outputted to the test log.""",
        allow_single_file = True,
        aspects = [sources_aspect],
    ),
})

# Helper function to convert a short path to a path that is
# found in the MANIFEST file.
def _short_path_to_manifest_path(ctx, short_path):
    if short_path.startswith("../"):
        return short_path[3:]
    else:
        return ctx.workspace_name + "/" + short_path

# Write the AMD names shim bootstrap file
def _write_amd_names_shim(ctx):
    amd_names_shim = ctx.actions.declare_file(
        "_%s.amd_names_shim.js" % ctx.label.name,
        sibling = ctx.outputs.executable,
    )
    write_amd_names_shim(ctx.actions, amd_names_shim, ctx.attr.bootstrap)
    return amd_names_shim

# Generates the karma configuration file for the rule
def _write_karma_config(ctx, files, amd_names_shim):
    configuration = ctx.actions.declare_file(
        "%s.conf.js" % ctx.label.name,
        sibling = ctx.outputs.executable,
    )

    config_file = ""
    if hasattr(ctx.file, "config_file"):
        config_file = ctx.file.config_file
        if hasattr(ctx.attr.config_file, "typescript"):
            config_file = ctx.attr.config_file.typescript.es5_sources.to_list()[0]

    # The files in the bootstrap attribute come before the require.js support.
    # Note that due to frameworks = ['jasmine'], a few scripts will come before
    # the bootstrap entries:
    # jasmine-core/lib/jasmine-core/jasmine.js
    # karma-jasmine/lib/boot.js
    # karma-jasmine/lib/adapter.js
    # This is desired so that the bootstrap entries can patch jasmine, as zone.js does.
    bootstrap_entries = [
        expand_path_into_runfiles(ctx, f.short_path)
        for f in ctx.files.bootstrap
    ]

    # Explicitly list the requirejs library files here, rather than use
    # `frameworks: ['requirejs']`
    # so that we control the script order, and the bootstrap files come before
    # require.js.
    # That allows bootstrap files to have anonymous AMD modules, or to do some
    # polyfilling before test libraries load.
    # See https://github.com/karma-runner/karma/issues/699
    # `NODE_MODULES/` is a prefix recogized by karma.conf.js to allow
    # for a priority require of nested `@bazel/karma/node_modules` before
    # looking in root node_modules.
    bootstrap_entries += [
        "NODE_MODULES/requirejs/require.js",
        "NODE_MODULES/karma-requirejs/lib/adapter.js",
        "/".join([ctx.workspace_name, amd_names_shim.short_path]),
    ]

    # Next we load the "runtime_deps" which we expect to contain named AMD modules
    # Thus they should come after the require.js script, but before any srcs or deps
    runtime_files = []
    for d in ctx.attr.runtime_deps:
        if not hasattr(d, "typescript"):
            # Workaround https://github.com/bazelbuild/rules_nodejs/issues/57
            # We should allow any JS source as long as it yields something that
            # can be loaded by require.js
            fail("labels in runtime_deps must be created by ts_library")
        for src in d.typescript.es5_sources.to_list():
            runtime_files.append(expand_path_into_runfiles(ctx, src.short_path))

    # Finally we load the user's srcs and deps
    user_entries = [
        expand_path_into_runfiles(ctx, f.short_path)
        for f in files.to_list()
    ]

    # Expand static_files paths to runfiles for config
    static_files = [
        expand_path_into_runfiles(ctx, f.short_path)
        for f in ctx.files.static_files
    ]

    # root-relative (runfiles) path to the directory containing karma.conf
    config_segments = len(configuration.short_path.split("/"))

    # configuration_env_vars are set using process.env()
    env_vars = ""
    for k in ctx.attr.configuration_env_vars:
        if k in ctx.var.keys():
            env_vars += "process.env[\"%s\"]=\"%s\";\n" % (k, ctx.var[k])

    ctx.actions.expand_template(
        output = configuration,
        template = ctx.file._conf_tmpl,
        substitutions = {
            "TMPL_bootstrap_files": "\n".join(["      '%s'," % e for e in bootstrap_entries]),
            "TMPL_config_file": expand_path_into_runfiles(ctx, config_file.short_path) if config_file else "",
            "TMPL_env_vars": env_vars,
            "TMPL_runfiles_path": "/".join([".."] * config_segments),
            "TMPL_runtime_files": "\n".join(["      '%s'," % e for e in runtime_files]),
            "TMPL_static_files": "\n".join(["      '%s'," % e for e in static_files]),
            "TMPL_user_files": "\n".join(["      '%s'," % e for e in user_entries]),
        },
    )

    return configuration

def run_karma_web_test(ctx):
    """Creates an action that can run karma.

    This is also used by ts_web_test_rule.

    Args:
      ctx: Bazel rule execution context

    Returns:
      The runfiles for the generated action.
    """
    files = depset(ctx.files.srcs)
    for d in ctx.attr.deps + ctx.attr.runtime_deps:
        if hasattr(d, "node_sources"):
            files = depset(transitive = [files, d.node_sources])
        elif hasattr(d, "files"):
            files = depset(transitive = [files, d.files])

    amd_names_shim = _write_amd_names_shim(ctx)

    configuration = _write_karma_config(ctx, files, amd_names_shim)

    ctx.actions.write(
        output = ctx.outputs.executable,
        is_executable = True,
        content = """#!/usr/bin/env bash
# Immediately exit if any command fails.
set -e

if [ -e "$RUNFILES_MANIFEST_FILE" ]; then
  while read line; do
    declare -a PARTS=($line)
    if [ "${{PARTS[0]}}" == "{TMPL_karma}" ]; then
      readonly KARMA=${{PARTS[1]}}
    elif [ "${{PARTS[0]}}" == "{TMPL_conf}" ]; then
      readonly CONF=${{PARTS[1]}}
    fi
  done < $RUNFILES_MANIFEST_FILE
else
  readonly KARMA=../{TMPL_karma}
  readonly CONF=../{TMPL_conf}
fi

export HOME=$(mktemp -d)

# Print the karma version in the test log
echo $($KARMA --version)

ARGV=( "start" $CONF )

# Detect that we are running as a test, by using well-known environment
# variables. See go/test-encyclopedia
# Note: in Bazel 0.14 and later, TEST_TMPDIR is set for both bazel test and bazel run
# so we also check for the BUILD_WORKSPACE_DIRECTORY which is set only for bazel run
if [[ ! -z "${{TEST_TMPDIR}}" && ! -n "${{BUILD_WORKSPACE_DIRECTORY}}" ]]; then
  ARGV+=( "--single-run" )
fi

$KARMA ${{ARGV[@]}}
""".format(
            TMPL_workspace = ctx.workspace_name,
            TMPL_karma = _short_path_to_manifest_path(ctx, ctx.executable.karma.short_path),
            TMPL_conf = _short_path_to_manifest_path(ctx, configuration.short_path),
        ),
    )

    config_sources = []
    if hasattr(ctx.file, "config_file"):
        if ctx.file.config_file:
            config_sources = [ctx.file.config_file]
        if hasattr(ctx.attr.config_file, "node_sources"):
            config_sources = ctx.attr.config_file.node_sources.to_list()

    runfiles = [
        configuration,
        amd_names_shim,
    ]
    runfiles += config_sources
    runfiles += ctx.files.srcs
    runfiles += ctx.files.deps
    runfiles += ctx.files.runtime_deps
    runfiles += ctx.files.bootstrap
    runfiles += ctx.files.static_files

    return ctx.runfiles(
        files = runfiles,
        transitive_files = files,
    ).merge(ctx.attr.karma[DefaultInfo].data_runfiles)

def _karma_web_test_impl(ctx):
    runfiles = run_karma_web_test(ctx)

    return [DefaultInfo(
        files = depset([ctx.outputs.executable]),
        runfiles = runfiles,
        executable = ctx.outputs.executable,
    )]

_karma_web_test = rule(
    implementation = _karma_web_test_impl,
    test = True,
    executable = True,
    attrs = KARMA_WEB_TEST_ATTRS,
)

def karma_web_test(
        srcs = [],
        deps = [],
        data = [],
        configuration_env_vars = [],
        bootstrap = [],
        runtime_deps = [],
        static_files = [],
        config_file = None,
        tags = [],
        **kwargs):
    """Runs unit tests in a browser with Karma.

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
      config_file: User supplied Karma configuration file. Bazel will override
          certain attributes of this configuration file. Attributes that are
          overridden will be outputted to the test log.
      tags: Standard Bazel tags, this macro adds tags for ibazel support
      **kwargs: Passed through to `karma_web_test`
    """

    _karma_web_test(
        srcs = srcs,
        deps = deps,
        data = data,
        configuration_env_vars = configuration_env_vars,
        bootstrap = bootstrap,
        runtime_deps = runtime_deps,
        static_files = static_files,
        config_file = config_file,
        tags = tags + [
            # Users don't need to know that this tag is required to run under ibazel
            "ibazel_notify_changes",
        ],
        **kwargs
    )

def karma_web_test_suite(
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
    """Defines a test_suite of web_test targets that wrap a karma_web_test target.

    This macro also accepts all parameters in karma_web_test. See karma_web_test docs
    for details.

    Args:
      name: The base name of the test
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
      tags: A list of test tag strings to apply to each generated web_test target.
        This macro adds a couple for ibazel.
      test_suite_tags: A list of tag strings for the generated test_suite.
      timeout: A string specifying the test timeout (default: computed from size)
      visibility: List of labels; optional.
      web_test_data: Data dependencies for the web_test.
      wrapped_test_tags: A list of test tag strings to use for the wrapped test
      **remaining_keyword_args: Arguments for the wrapped test target.
    """

    # Check explicitly for None so that users can set this to the empty list
    if wrapped_test_tags == None:
        wrapped_test_tags = DEFAULT_WRAPPED_TEST_TAGS

    size = size or "large"

    wrapped_test_name = name + "_wrapped_test"

    _karma_web_test(
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

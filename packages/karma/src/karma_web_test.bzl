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

load("@build_bazel_rules_nodejs//:providers.bzl", "JSNamedModuleInfo", "NpmPackageInfo", "node_modules_aspect")
load("@build_bazel_rules_nodejs//internal/js_library:js_library.bzl", "write_amd_names_shim")
load("@io_bazel_rules_webtesting//web:web.bzl", "web_test_suite")
load("@io_bazel_rules_webtesting//web/internal:constants.bzl", "DEFAULT_WRAPPED_TEST_TAGS")

KARMA_PEER_DEPS = [
    "@npm//@bazel/karma",
    "@npm//jasmine-core",
    "@npm//karma",
    "@npm//karma-chrome-launcher",
    "@npm//karma-firefox-launcher",
    "@npm//karma-jasmine",
    "@npm//karma-requirejs",
    "@npm//karma-sourcemap-loader",
    "@npm//requirejs",
    "@npm//tmp",
]

KARMA_WEB_TEST_ATTRS = {
    "srcs": attr.label_list(
        doc = "A list of JavaScript test files",
        allow_files = [".js"],
    ),
    "bootstrap": attr.label_list(
        doc = """JavaScript files to include *before* the module loader (require.js).
        For example, you can include Reflect,js for TypeScript decorator metadata reflection,
        or UMD bundles for third-party libraries.""",
        allow_files = [".js"],
    ),
    "config_file": attr.label(
        doc = """User supplied Karma configuration file. Bazel will override
        certain attributes of this configuration file. Attributes that are
        overridden will be outputted to the test log.""",
        allow_single_file = True,
    ),
    "configuration_env_vars": attr.string_list(
        doc = """Pass these configuration environment variables to the resulting binary.
        Chooses a subset of the configuration environment variables (taken from ctx.var), which also
        includes anything specified via the --define flag.
        Note, this can lead to different outputs produced by this rule.""",
        default = [],
    ),
    "data": attr.label_list(
        doc = "Runtime dependencies",
        allow_files = True,
    ),
    "karma": attr.label(
        doc = "karma binary label",
        default = "@npm//karma/bin:karma",
        executable = True,
        cfg = "target",
        allow_files = True,
    ),
    "static_files": attr.label_list(
        doc = """Arbitrary files which are available to be served on request.
        Files are served at:
        `/base/<WORKSPACE_NAME>/<path-to-file>`, e.g.
        `/base/npm_bazel_typescript/examples/testing/static_script.js`""",
        allow_files = True,
    ),
    "runtime_deps": attr.label_list(
        doc = """Dependencies which should be loaded after the module loader but before the srcs and deps.
        These should be a list of targets which produce JavaScript such as `ts_library`.
        The files will be loaded in the same order they are declared by that rule.""",
        allow_files = True,
        aspects = [node_modules_aspect],
    ),
    "deps": attr.label_list(
        doc = "Other targets which produce JavaScript such as `ts_library`",
        allow_files = True,
        aspects = [node_modules_aspect],
    ),
    "_conf_tmpl": attr.label(
        default = "//:karma.conf.js",
        allow_single_file = True,
    ),
}

# Avoid using non-normalized paths (workspace/../other_workspace/path)
def _to_manifest_path(ctx, file):
    if file.short_path.startswith("../"):
        return file.short_path[3:]
    else:
        return ctx.workspace_name + "/" + file.short_path

# Write the AMD names shim bootstrap file
def _write_amd_names_shim(ctx):
    amd_names_shim = ctx.actions.declare_file(
        "_%s.amd_names_shim.js" % ctx.label.name,
        sibling = ctx.outputs.executable,
    )
    write_amd_names_shim(ctx.actions, amd_names_shim, ctx.attr.bootstrap)
    return amd_names_shim

def _filter_js(files):
    return [f for f in files if f.extension == "js" or f.extension == "mjs"]

# Generates the karma configuration file for the rule
def _write_karma_config(ctx, files, amd_names_shim):
    configuration = ctx.actions.declare_file(
        "%s.conf.js" % ctx.label.name,
        sibling = ctx.outputs.executable,
    )

    config_file = None

    if ctx.attr.config_file:
        # TODO: switch to JSModuleInfo when it is available
        if JSNamedModuleInfo in ctx.attr.config_file:
            config_file = _filter_js(ctx.attr.config_file[JSNamedModuleInfo].direct_sources.to_list())[0]
        else:
            config_file = ctx.file.config_file

    # The files in the bootstrap attribute come before the require.js support.
    # Note that due to frameworks = ['jasmine'], a few scripts will come before
    # the bootstrap entries:
    # jasmine-core/lib/jasmine-core/jasmine.js
    # karma-jasmine/lib/boot.js
    # karma-jasmine/lib/adapter.js
    # This is desired so that the bootstrap entries can patch jasmine, as zone.js does.
    bootstrap_entries = [
        _to_manifest_path(ctx, f)
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
    # for a priority require of nested `@bazel/typescript/node_modules` before
    # looking in root node_modules.
    bootstrap_entries += [
        "NODE_MODULES/requirejs/require.js",
        "NODE_MODULES/karma-requirejs/lib/adapter.js",
        "/".join([ctx.workspace_name, amd_names_shim.short_path]),
    ]

    # Next we load the "runtime_deps" which we expect to contain named AMD modules
    # Thus they should come after the require.js script, but before any srcs or deps
    runtime_files = []
    for dep in ctx.attr.runtime_deps:
        if JSNamedModuleInfo in dep:
            for src in dep[JSNamedModuleInfo].direct_sources.to_list():
                runtime_files.append(_to_manifest_path(ctx, src))
        if not JSNamedModuleInfo in dep and not NpmPackageInfo in dep and hasattr(dep, "files"):
            # These are javascript files provided by DefaultInfo from a direct
            # dep that has no JSNamedModuleInfo provider or NpmPackageInfo
            # provider (not an npm dep). These files must be in named AMD or named
            # UMD format.
            for src in dep.files.to_list():
                runtime_files.append(_to_manifest_path(ctx, src))

    # Finally we load the user's srcs and deps
    user_entries = [
        _to_manifest_path(ctx, f)
        for f in files.to_list()
        if f.path.endswith(".js")
    ]

    # Expand static_files paths to runfiles for config
    static_files = [
        _to_manifest_path(ctx, f)
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
            "TMPL_bootstrap_files": "\n      ".join(["'%s'," % e for e in bootstrap_entries]),
            "TMPL_config_file": _to_manifest_path(ctx, config_file) if config_file else "",
            "TMPL_env_vars": env_vars,
            "TMPL_runfiles_path": "/".join([".."] * config_segments),
            "TMPL_runtime_files": "\n    ".join(["'%s'," % e for e in runtime_files]),
            "TMPL_static_files": "\n        ".join(["'%s'," % e for e in static_files]),
            "TMPL_user_files": "\n      ".join(["'%s'," % e for e in user_entries]),
        },
    )

    return configuration

def _karma_web_test_impl(ctx):
    files_depsets = [depset(ctx.files.srcs)]
    for dep in ctx.attr.deps + ctx.attr.runtime_deps:
        if JSNamedModuleInfo in dep:
            files_depsets.append(dep[JSNamedModuleInfo].sources)
        if not JSNamedModuleInfo in dep and not NpmPackageInfo in dep and hasattr(dep, "files"):
            # These are javascript files provided by DefaultInfo from a direct
            # dep that has no JSNamedModuleInfo provider or NpmPackageInfo
            # provider (not an npm dep). These files must be in named AMD or named
            # UMD format.
            files_depsets.append(dep.files)
    files = depset(transitive = files_depsets)

    # Also include files from npm fine grained deps as inputs.
    # These deps are identified by the NpmPackageInfo provider.
    node_modules_depsets = []
    for dep in ctx.attr.deps + ctx.attr.runtime_deps:
        if NpmPackageInfo in dep:
            node_modules_depsets.append(dep[NpmPackageInfo].sources)
    node_modules = depset(transitive = node_modules_depsets)

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
            TMPL_karma = _to_manifest_path(ctx, ctx.executable.karma),
            TMPL_conf = _to_manifest_path(ctx, configuration),
        ),
    )

    config_sources = []

    if ctx.attr.config_file:
        # TODO: switch to JSModuleInfo when it is available
        if JSNamedModuleInfo in ctx.attr.config_file:
            config_sources = ctx.attr.config_file[JSNamedModuleInfo].sources.to_list()
        else:
            config_sources = [ctx.file.config_file]

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
    runfiles += ctx.files.data

    return [DefaultInfo(
        files = depset([ctx.outputs.executable]),
        runfiles = ctx.runfiles(
            files = runfiles,
            transitive_files = depset(transitive = [files, node_modules]),
        ).merge(ctx.attr.karma[DefaultInfo].data_runfiles),
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
        peer_deps = KARMA_PEER_DEPS,
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
          `/base/npm_bazel_typescript/examples/testing/static_script.js`
      config_file: User supplied Karma configuration file. Bazel will override
          certain attributes of this configuration file. Attributes that are
          overridden will be outputted to the test log.
      tags: Standard Bazel tags, this macro adds tags for ibazel support
      peer_deps: list of peer npm deps required by karma_web_test
      **kwargs: Passed through to `karma_web_test`
    """

    _karma_web_test(
        srcs = srcs,
        deps = deps + peer_deps,
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
        browsers = None,
        web_test_data = [],
        wrapped_test_tags = list(DEFAULT_WRAPPED_TEST_TAGS),
        **kwargs):
    """Defines a test_suite of web_test targets that wrap a karma_web_test target.

    This macro accepts all parameters in karma_web_test and adds additional parameters
    for the suite. See karma_web_test docs for all karma_web_test.

    The wrapping macro is `web_test_suite` which comes from rules_websting:
    https://github.com/bazelbuild/rules_webtesting/blob/master/web/web.bzl.

    Args:
      name: The base name of the test
      browsers: A sequence of labels specifying the browsers to use.
      web_test_data: Data dependencies for the wrapoer web_test targets.
      wrapped_test_tags: A list of test tag strings to use for the wrapped
        karma_web_test target.
      **kwargs: Arguments for the wrapped karma_web_test target.
    """

    # Common attributes
    args = kwargs.pop("args", None)
    flaky = kwargs.pop("flaky", None)
    local = kwargs.pop("local", None)
    shard_count = kwargs.pop("shard_count", None)
    size = kwargs.pop("size", "large")
    timeout = kwargs.pop("timeout", None)

    # Wrapper attributes
    browser_overrides = kwargs.pop("browser_overrides", None)
    config = kwargs.pop("config", None)
    test_suite_tags = kwargs.pop("test_suite_tags", None)
    visibility = kwargs.pop("visibility", None)
    tags = kwargs.pop("tags", []) + [
        # Users don't need to know that this tag is required to run under ibazel
        "ibazel_notify_changes",
    ]
    if browsers == None:
        browsers = ["@io_bazel_rules_webtesting//browsers:chromium-local"]

        # rules_webesting requires the "native" tag for browsers
        if not "native" in tags:
            tags = tags + ["native"]

    # The wrapped `karma_web_test` target
    wrapped_test_name = name + "_wrapped_test"
    karma_web_test(
        name = wrapped_test_name,
        args = args,
        flaky = flaky,
        local = local,
        shard_count = shard_count,
        size = size,
        timeout = timeout,
        tags = wrapped_test_tags,
        visibility = ["//visibility:private"],
        **kwargs
    )

    # The wrapper `web_test_suite` target
    web_test_suite(
        name = name,
        args = args,
        flaky = flaky,
        local = local,
        shard_count = shard_count,
        size = size,
        timeout = timeout,
        launcher = ":" + wrapped_test_name,
        browsers = browsers,
        browser_overrides = browser_overrides,
        config = config,
        data = web_test_data,
        tags = tags,
        test = wrapped_test_name,
        test_suite_tags = test_suite_tags,
        visibility = visibility,
    )

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
"Run end-to-end tests with Protractor"

load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary")
load("@build_bazel_rules_nodejs//internal/common:expand_into_runfiles.bzl", "expand_path_into_runfiles")
load("@build_bazel_rules_nodejs//internal/common:sources_aspect.bzl", "sources_aspect")
load("@build_bazel_rules_nodejs//internal/common:windows_utils.bzl", "create_windows_native_launcher_script", "is_windows")
load("@io_bazel_rules_webtesting//web:web.bzl", "web_test_suite")
load("@io_bazel_rules_webtesting//web/internal:constants.bzl", "DEFAULT_WRAPPED_TEST_TAGS")

_CONF_TMPL = "//:protractor.conf.js"
_DEFUALT_PROTRACTOR = "@npm//@bazel/protractor"
_DEFUALT_PROTRACTOR_ENTRY_POINT = "@npm//:node_modules/@bazel/protractor/protractor.js"

def _short_path_to_manifest_path(ctx, short_path):
    if short_path.startswith("../"):
        return short_path[3:]
    else:
        return ctx.workspace_name + "/" + short_path

def _protractor_web_test_impl(ctx):
    configuration = ctx.actions.declare_file(
        "%s.conf.js" % ctx.label.name,
        sibling = ctx.outputs.script,
    )

    files = depset(ctx.files.srcs)
    for d in ctx.attr.deps:
        if hasattr(d, "node_sources"):
            files = depset(transitive = [files, d.node_sources])
        elif hasattr(d, "files"):
            files = depset(transitive = [files, d.files])

    specs = [
        expand_path_into_runfiles(ctx, f.short_path)
        for f in files.to_list()
    ]

    configuration_sources = []
    if ctx.file.configuration:
        configuration_sources = [ctx.file.configuration]
    if hasattr(ctx.attr.configuration, "node_sources"):
        configuration_sources = ctx.attr.configuration.node_sources.to_list()

    configuration_file = ctx.file.configuration
    if hasattr(ctx.attr.configuration, "typescript"):
        configuration_file = ctx.attr.configuration.typescript.es5_sources.to_list()[0]

    on_prepare_sources = []
    if ctx.file.on_prepare:
        on_prepare_sources = [ctx.file.on_prepare]
    if hasattr(ctx.attr.on_prepare, "node_sources"):
        on_prepare_sources = ctx.attr.on_prepare.node_sources.to_list()

    on_prepare_file = ctx.file.on_prepare
    if hasattr(ctx.attr.on_prepare, "typescript"):
        on_prepare_file = ctx.attr.on_prepare.typescript.es5_sources.to_list()[0]

    ctx.actions.expand_template(
        output = configuration,
        template = ctx.file._conf_tmpl,
        substitutions = {
            "TMPL_config": expand_path_into_runfiles(ctx, configuration_file.short_path) if configuration_file else "",
            "TMPL_on_prepare": expand_path_into_runfiles(ctx, on_prepare_file.short_path) if on_prepare_file else "",
            "TMPL_server": ctx.executable.server.short_path if ctx.executable.server else "",
            "TMPL_specs": "\n".join(["      '%s'," % e for e in specs]),
            "TMPL_workspace": ctx.workspace_name,
        },
    )

    runfiles = [configuration] + configuration_sources + on_prepare_sources

    ctx.actions.write(
        output = ctx.outputs.script,
        is_executable = True,
        content = """#!/usr/bin/env bash
# Immediately exit if any command fails.
set -e

if [ -e "$RUNFILES_MANIFEST_FILE" ]; then
  while read line; do
    declare -a PARTS=($line)
    if [ "${{PARTS[0]}}" == "{TMPL_protractor}" ]; then
      readonly PROTRACTOR=${{PARTS[1]}}
    elif [ "${{PARTS[0]}}" == "{TMPL_conf}" ]; then
      readonly CONF=${{PARTS[1]}}
    fi
  done < $RUNFILES_MANIFEST_FILE
else
  readonly PROTRACTOR=../{TMPL_protractor}
  readonly CONF=../{TMPL_conf}
fi

export HOME=$(mktemp -d)

# Print the protractor version in the test log
PROTRACTOR_VERSION=$($PROTRACTOR --version)
echo "Protractor $PROTRACTOR_VERSION"

# Run the protractor binary
$PROTRACTOR $CONF
""".format(
            TMPL_protractor = _short_path_to_manifest_path(ctx, ctx.executable.protractor.short_path),
            TMPL_conf = _short_path_to_manifest_path(ctx, configuration.short_path),
        ),
    )

    if is_windows(ctx):
        runfiles = runfiles + [ctx.outputs.script]
        executable = create_windows_native_launcher_script(ctx, ctx.outputs.script)
    else:
        executable = ctx.outputs.script

    return [DefaultInfo(
        files = depset([ctx.outputs.script]),
        runfiles = ctx.runfiles(
            files = runfiles,
            transitive_files = files,
            # Propagate protractor_bin and its runfiles
            collect_data = True,
            collect_default = True,
        ),
        executable = executable,
    )]

_protractor_web_test = rule(
    implementation = _protractor_web_test_impl,
    test = True,
    executable = True,
    outputs = {"script": "%{name}.sh"},
    toolchains = ["@bazel_tools//tools/sh:toolchain_type"],
    attrs = {
        "srcs": attr.label_list(
            doc = "A list of JavaScript test files",
            allow_files = [".js"],
        ),
        "configuration": attr.label(
            doc = "Protractor configuration file",
            allow_single_file = True,
            aspects = [sources_aspect],
        ),
        "data": attr.label_list(
            doc = "Runtime dependencies",
        ),
        "on_prepare": attr.label(
            doc = """A file with a node.js script to run once before all tests run.
            If the script exports a function which returns a promise, protractor
            will wait for the promise to resolve before beginning tests.""",
            allow_single_file = True,
            aspects = [sources_aspect],
        ),
        "protractor": attr.label(
            doc = "Protractor executable target",
            executable = True,
            cfg = "target",
            allow_files = True,
        ),
        "server": attr.label(
            doc = "Optional server executable target",
            executable = True,
            cfg = "target",
            allow_files = True,
        ),
        "deps": attr.label_list(
            doc = "Other targets which produce JavaScript such as `ts_library`",
            allow_files = True,
            aspects = [sources_aspect],
        ),
        "_conf_tmpl": attr.label(
            default = Label(_CONF_TMPL),
            allow_single_file = True,
        ),
    },
)

def protractor_web_test(
        name,
        configuration = None,
        on_prepare = None,
        srcs = [],
        deps = [],
        data = [],
        server = None,
        tags = [],
        protractor = _DEFUALT_PROTRACTOR,
        protractor_entry_point = _DEFUALT_PROTRACTOR_ENTRY_POINT,
        **kwargs):
    """Runs a protractor test in a browser.

    Args:
      name: The name of the test
      configuration: Protractor configuration file.
      on_prepare: A file with a node.js script to run once before all tests run.
          If the script exports a function which returns a promise, protractor
          will wait for the promise to resolve before beginning tests.
      srcs: JavaScript source files
      deps: Other targets which produce JavaScript such as `ts_library`
      data: Runtime dependencies
      server: Optional server executable target
      tags: Standard Bazel tags, this macro adds one for ibazel
      protractor: A label providing the @bazel/protractor npm dependency.
      protractor_entry_point: A label providing the @bazel/protractor entry point.
      **kwargs: passed through to `_protractor_web_test`
    """

    protractor_bin_name = name + "_protractor_bin"

    nodejs_binary(
        name = protractor_bin_name,
        entry_point = protractor_entry_point,
        data = srcs + deps + data + [protractor],
        testonly = 1,
        visibility = ["//visibility:private"],
    )

    # Our binary dependency must be in data[] for collect_data to pick it up
    # FIXME: maybe we can just ask :protractor_bin_name for its runfiles attr
    web_test_data = data + [":" + protractor_bin_name]
    if server:
        web_test_data += [server]

    _protractor_web_test(
        name = name,
        configuration = configuration,
        on_prepare = on_prepare,
        srcs = srcs,
        deps = deps,
        data = web_test_data,
        server = server,
        protractor = protractor_bin_name,
        tags = tags + [
            # Users don't need to know that this tag is required to run under ibazel
            "ibazel_notify_changes",
        ],
        **kwargs
    )

def protractor_web_test_suite(
        name,
        configuration = None,
        on_prepare = None,
        srcs = [],
        deps = [],
        data = [],
        server = None,
        browsers = None,
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
        protractor = _DEFUALT_PROTRACTOR,
        protractor_entry_point = _DEFUALT_PROTRACTOR_ENTRY_POINT,
        **remaining_keyword_args):
    """Defines a test_suite of web_test targets that wrap a protractor_web_test target.

    Args:
      name: The base name of the test.
      configuration: Protractor configuration file.
      on_prepare: A file with a node.js script to run once before all tests run.
          If the script exports a function which returns a promise, protractor
          will wait for the promise to resolve before beginning tests.
      srcs: JavaScript source files
      deps: Other targets which produce JavaScript such as `ts_library`
      data: Runtime dependencies
      server: Optional server executable target
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
      protractor: Protractor entry_point. Defaults to @npm//:node_modules/protractor/bin/protractor
          but should be changed to @your_npm_workspace//:node_modules/protractor/bin/protractor if
          you are not using @npm for your npm dependencies.
      **remaining_keyword_args: Arguments for the wrapped test target.
    """

    # Check explicitly for None so that users can set this to the empty list
    if wrapped_test_tags == None:
        wrapped_test_tags = DEFAULT_WRAPPED_TEST_TAGS

    if browsers == None:
        browsers = ["@io_bazel_rules_webtesting//browsers:chromium-local"]
        if not "native" in tags:
            tags = tags + ["native"]

    size = size or "large"

    wrapped_test_name = name + "_wrapped_test"
    protractor_bin_name = name + "_protractor_bin"

    # Users don't need to know that this tag is required to run under ibazel
    tags = tags + ["ibazel_notify_changes"]

    nodejs_binary(
        name = protractor_bin_name,
        entry_point = protractor_entry_point,
        data = srcs + deps + data + [protractor],
        testonly = 1,
        visibility = ["//visibility:private"],
    )

    # Our binary dependency must be in data[] for collect_data to pick it up
    # FIXME: maybe we can just ask the :protractor_bin_name for its runfiles attr
    web_test_data = web_test_data + [":" + protractor_bin_name]
    if server:
        web_test_data += [server]

    _protractor_web_test(
        name = wrapped_test_name,
        configuration = configuration,
        on_prepare = on_prepare,
        srcs = srcs,
        deps = deps,
        data = web_test_data,
        server = server,
        protractor = protractor_bin_name,
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
        tags = tags,
        test = wrapped_test_name,
        test_suite_tags = test_suite_tags,
        timeout = timeout,
        visibility = visibility,
    )

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

load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")
load("@build_bazel_rules_nodejs//:providers.bzl", "JSModuleInfo", "JSNamedModuleInfo")
load("@build_bazel_rules_nodejs//internal/common:windows_utils.bzl", "create_windows_native_launcher_script", "is_windows")
load("@io_bazel_rules_webtesting//web:web.bzl", "web_test_suite")
load("@io_bazel_rules_webtesting//web/internal:constants.bzl", "DEFAULT_WRAPPED_TEST_TAGS")

_PROTRACTOR_PEER_DEPS = [
    # BEGIN-INTERNAL
    "@build_bazel_rules_nodejs" +
    # END-INTERNAL
    "//packages/protractor",
    # BEGIN-INTERNAL
    "@npm" +
    # END-INTERNAL
    "//protractor",
]
_PROTRACTOR_ENTRY_POINT = (
    # BEGIN-INTERNAL
    "@npm" +
    # END-INTERNAL
    "//:node_modules/protractor/bin/protractor"
)

# Avoid using non-normalized paths (workspace/../other_workspace/path)
def _to_manifest_path(ctx, file):
    if file.short_path.startswith("../"):
        return file.short_path[3:]
    else:
        return ctx.workspace_name + "/" + file.short_path

def _filter_js(files):
    return [f for f in files if f.extension == "js" or f.extension == "mjs"]

def _protractor_web_test_impl(ctx):
    configuration = ctx.actions.declare_file(
        "%s.conf.js" % ctx.label.name,
        sibling = ctx.outputs.script,
    )

    named_module_files_depsets = [depset(ctx.files.srcs)]
    for dep in ctx.attr.deps:
        if JSNamedModuleInfo in dep:
            named_module_files_depsets.append(dep[JSNamedModuleInfo].sources)
        elif hasattr(dep, "files"):
            # These are javascript files provided by DefaultInfo from a direct
            # dep that has no JSNamedModuleInfo provider. These files must be in
            # named AMD or named UMD format.
            named_module_files_depsets.append(dep.files)
    named_module_files = depset(transitive = named_module_files_depsets)

    # Also include files from npm fine grained deps as inputs.
    # These deps are identified by the ExternalNpmPackageInfo provider.
    node_modules_depsets = []
    # for dep in ctx.attr.deps:
    #     if ExternalNpmPackageInfo in dep:
    #         node_modules_depsets.append(dep[ExternalNpmPackageInfo].sources)
    node_modules = depset(transitive = node_modules_depsets)

    specs = [
        _to_manifest_path(ctx, f)
        for f in named_module_files.to_list()
    ]

    configuration_sources = []
    configuration_file = None
    if ctx.attr.configuration:
        if JSModuleInfo in ctx.attr.configuration:
            configuration_sources = ctx.attr.configuration[JSModuleInfo].sources.to_list()
            configuration_file = _filter_js(ctx.attr.configuration[JSModuleInfo].direct_sources.to_list())[0]
        else:
            configuration_sources = [ctx.file.configuration]
            configuration_file = ctx.file.configuration

    on_prepare_sources = []
    on_prepare_file = None
    if ctx.attr.on_prepare:
        if JSModuleInfo in ctx.attr.on_prepare:
            on_prepare_sources = ctx.attr.on_prepare[JSModuleInfo].sources.to_list()
            on_prepare_file = _filter_js(ctx.attr.on_prepare[JSModuleInfo].direct_sources.to_list())[0]
        else:
            on_prepare_sources = [ctx.file.on_prepare]
            on_prepare_file = ctx.file.on_prepare

    ctx.actions.expand_template(
        output = configuration,
        template = ctx.file._conf_tmpl,
        substitutions = {
            "TMPL_config": _to_manifest_path(ctx, configuration_file) if configuration_file else "",
            "TMPL_on_prepare": _to_manifest_path(ctx, on_prepare_file) if on_prepare_file else "",
            "TMPL_server": ctx.executable.server.short_path if ctx.executable.server else "",
            "TMPL_specs": "\n".join(["      '%s'," % e for e in specs]),
            "TMPL_workspace": ctx.workspace_name,
        },
    )

    runfiles = [configuration] + configuration_sources + on_prepare_sources
    server_runfiles = depset()

    # If a server has been specified, add it to the runfiles together with it's required runfiles. This is necessary
    # as the test executable references the server executable as per `TMPL_server` and executes it.
    if ctx.executable.server:
        server_runfiles = depset(
            [ctx.executable.server],
            transitive = [ctx.attr.server[DefaultInfo].default_runfiles.files],
        )

    ctx.actions.write(
        output = ctx.outputs.script,
        is_executable = True,
        content = """#!/usr/bin/env bash
# --- begin runfiles.bash initialization v2 ---
# Copy-pasted from the Bazel Bash runfiles library v2.
set -uo pipefail; f=build_bazel_rules_nodejs/third_party/github.com/bazelbuild/bazel/tools/bash/runfiles/runfiles.bash
source "${{RUNFILES_DIR:-/dev/null}}/$f" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "${{RUNFILES_MANIFEST_FILE:-/dev/null}}" | cut -f2- -d' ')" 2>/dev/null || \
  source "$0.runfiles/$f" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "$0.runfiles_manifest" | cut -f2- -d' ')" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "$0.exe.runfiles_manifest" | cut -f2- -d' ')" 2>/dev/null || \
  {{ echo>&2 "ERROR: cannot find $f"; exit 1; }}; f=; set -e
# --- end runfiles.bash initialization v2 ---

readonly PROTRACTOR=$(rlocation "{TMPL_protractor}")
readonly CONF=$(rlocation "{TMPL_conf}")

export HOME=$(mktemp -d)

# Pass --node_options from args on protractor node process
NODE_OPTIONS=()
for ARG in "$@"; do
  case "${{ARG}}" in
    --node_options=*) NODE_OPTIONS+=( "${{ARG}}" ) ;;
  esac
done

PROTRACTOR_VERSION=$(${{PROTRACTOR}} --version)

printf "\n\n\n\nRunning protractor tests\n-----------------------------------------------------------------------------\n"
echo "version     :" ${{PROTRACTOR_VERSION#Version }}
echo "pwd         :" ${{PWD}}
echo "conf        :" ${{CONF}}
echo "node_options:" ${{NODE_OPTIONS[@]:-}}
printf "\n"

readonly COMMAND="${{PROTRACTOR}} ${{CONF}} ${{NODE_OPTIONS[@]:-}}"
${{COMMAND}}
""".format(
            TMPL_protractor = _to_manifest_path(ctx, ctx.executable.protractor),
            TMPL_conf = _to_manifest_path(ctx, configuration),
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
            transitive_files = depset(transitive = [named_module_files, node_modules, server_runfiles]),
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
        "configuration": attr.label(
            doc = "Protractor configuration file",
            allow_single_file = True,
        ),
        "data": attr.label_list(
            doc = "Runtime dependencies",
            allow_files = True,
        ),
        "deps": attr.label_list(
            doc = "Other targets which produce JavaScript such as `ts_library`",
            allow_files = True,
        ),
        "on_prepare": attr.label(
            doc = """A file with a node.js script to run once before all tests run.
            If the script exports a function which returns a promise, protractor
            will wait for the promise to resolve before beginning tests.""",
            allow_single_file = True,
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
        "srcs": attr.label_list(
            doc = "A list of JavaScript test files",
            allow_files = [".js"],
        ),
        "_conf_tmpl": attr.label(
            default = Label("//packages/protractor:protractor.conf.js"),
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
        peer_deps = _PROTRACTOR_PEER_DEPS,
        protractor_entry_point = Label(_PROTRACTOR_ENTRY_POINT),
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
      peer_deps: List of peer npm deps required by protractor_web_test
      protractor_entry_point: A label providing the protractor entry point
          Default to `:node_modules/protractor/bin/protractor`.
      **kwargs: passed through to `protractor_web_test`
    """

    protractor_bin_name = name + "_protractor_bin"

    nodejs_binary(
        name = protractor_bin_name,
        entry_point = protractor_entry_point,
        data = srcs + deps + data + [Label(d) for d in peer_deps],
        testonly = 1,
        # TODO: make protractor binary not depend on monkey-patched require()
        templated_args = ["--bazel_patch_module_resolver"],
        visibility = ["//visibility:private"],
    )

    # Our binary dependency must be in data[] for collect_data to pick it up
    # FIXME: maybe we can just ask :protractor_bin_name for its runfiles attr
    web_test_data = data + [":" + protractor_bin_name]

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
        browsers = None,
        web_test_data = [],
        wrapped_test_tags = list(DEFAULT_WRAPPED_TEST_TAGS),
        **kwargs):
    """Defines a test_suite of web_test targets that wrap a protractor_web_test target.

    Args:
      name: The base name of the test
      browsers: A sequence of labels specifying the browsers to use.
      web_test_data: Data dependencies for the wrapper web_test targets.
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
    protractor_web_test(
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

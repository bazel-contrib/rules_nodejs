# Copyright 2020 The Bazel Authors. All rights reserved.
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
"E2E testing with Cypress"

load("@rules_nodejs//nodejs:providers.bzl", "JSModuleInfo")
load("@build_bazel_rules_nodejs//:providers.bzl", "JSNamedModuleInfo")
load("@build_bazel_rules_nodejs//internal/node:node.bzl", "nodejs_test_kwargs")

ATTRS = dict(
    nodejs_test_kwargs["attrs"],
    config_file = attr.label(
        allow_single_file = [".ts", ".js", ".json"],
        mandatory = True,
        doc = "cypress.json or cypress.config.{js,ts} configuration file. See https://docs.cypress.io/guides/references/configuration.",
    ),
    cypress_npm_package = attr.label(
        doc = "The cypress npm package. If you installed cypress as a peer dependency, this should not need to be set.",
        default = Label("//cypress"),
        allow_files = True,
    ),
    entry_point = attr.label(
        doc = """Entry point JS file which bootstraps the cypress cli""",
        allow_single_file = True,
        default = Label("@build_bazel_rules_nodejs//packages/cypress/internal:run-cypress.js"),
    ),
    plugin_file = attr.label(
        default = Label("@build_bazel_rules_nodejs//packages/cypress/internal:plugins/base.js"),
        allow_single_file = True,
        doc = "Your cypress plugin file. See https://docs.cypress.io/guides/tooling/plugins-guide",
    ),
    srcs = attr.label_list(
        doc = "A list of test files. See https://docs.cypress.io/guides/core-concepts/writing-and-organizing-tests#Test-files",
        allow_files = True,
    ),
    # Unused by this rule, but here to require that a user supplies one for the downstream nodejs_test
    _plugin_wrapper = attr.label(
        default = Label("@build_bazel_rules_nodejs//packages/cypress/internal:plugins/index.js.tpl"),
        allow_single_file = True,
    ),
)

def _filter_js(files):
    return [f for f in files if f.extension == "js" or f.extension == "mjs"]

def _cypress_plugin_wrapper(ctx):
    plugin_file = None

    if JSNamedModuleInfo in ctx.attr.plugin_file and len(ctx.attr.plugin_file[JSNamedModuleInfo].direct_sources.to_list()) > 0:
        plugin_file = _filter_js(ctx.attr.plugin_file[JSNamedModuleInfo].direct_sources.to_list())[0]
    if JSModuleInfo in ctx.attr.plugin_file and len(ctx.attr.plugin_file[JSModuleInfo].direct_sources.to_list()) > 0:
        plugin_file = _filter_js(ctx.attr.plugin_file[JSModuleInfo].direct_sources.to_list())[0]
    else:
        plugin_file = ctx.file.plugin_file

    # TODO: switch to JSModuleInfo when it is available
    integration_files = []
    for src in ctx.attr.srcs:
        if JSNamedModuleInfo in src:
            integration_files.append(src[JSNamedModuleInfo].direct_sources)

    integration_files_short_paths = ["'{}'".format(f.short_path) for f in _filter_js(depset(direct = ctx.files.srcs, transitive = integration_files).to_list())]

    plugin_file_wrapper = ctx.actions.declare_file("{}_cypress_plugin_wrapper.js".format(ctx.attr.name))

    ctx.actions.expand_template(
        output = plugin_file_wrapper,
        template = ctx.file._plugin_wrapper,
        substitutions = {
            "TEMPLATED_integrationFileShortPaths": "[\n  {files}\n]".format(files = ",\n  ".join(integration_files_short_paths)),
            "TEMPLATED_pluginsFile": plugin_file.short_path,
        },
    )

    return plugin_file_wrapper

def _cypress_web_test_impl(ctx):
    plugin_wrapper = _cypress_plugin_wrapper(ctx)

    cypressinfo = ctx.toolchains[Label("@build_bazel_rules_nodejs//toolchains/cypress:toolchain_type")].cypressinfo

    expanded_args = [
        ctx.file.config_file.short_path,
        plugin_wrapper.short_path,
        cypressinfo.cypress_bin_path,
    ]

    runfiles = depset(
        [plugin_wrapper] +
        ctx.files.config_file +
        ctx.files.cypress_npm_package +
        ctx.files.plugin_file +
        ctx.files.srcs +
        cypressinfo.cypress_files,
    )

    data = depset([
        ctx.attr.config_file,
        ctx.attr.cypress_npm_package,
        ctx.attr.plugin_file,
    ] + ctx.attr.srcs)

    return nodejs_test_kwargs["implementation"](
        ctx,
        data = data.to_list(),
        runfiles = runfiles.to_list(),
        expanded_args = expanded_args,
    )

toolchain_type_label = Label("@build_bazel_rules_nodejs//toolchains/cypress:toolchain_type")

_cypress_web_test_kwargs = dict(
    nodejs_test_kwargs,
    implementation = _cypress_web_test_impl,
    attrs = ATTRS,
    toolchains = nodejs_test_kwargs["toolchains"] + [
        "@{}//{}:{}".format(toolchain_type_label.workspace_name, toolchain_type_label.package, toolchain_type_label.name),
    ],
)

cypress_web_test = rule(**_cypress_web_test_kwargs)

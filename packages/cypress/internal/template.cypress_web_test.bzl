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

load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_test")
load("@build_bazel_rules_nodejs//:providers.bzl", "JSNamedModuleInfo")

def _filter_js(files):
    return [f for f in files if f.extension == "js" or f.extension == "mjs"]

def _cypress_plugin_impl(ctx):
    plugins_file = None

    # TODO: switch to JSModuleInfo when it is available
    if JSNamedModuleInfo in ctx.attr.plugins_file:
        plugins_file = _filter_js(ctx.attr.plugins_file[JSNamedModuleInfo].direct_sources.to_list())[0]
    else:
        plugins_file = ctx.file.plugins_file

    # TODO: switch to JSModuleInfo when it is available
    integration_files = []
    for src in ctx.attr.srcs:
        if JSNamedModuleInfo in src:
            integration_files.append(src[JSNamedModuleInfo].direct_sources)

    integration_files_short_paths = ["'{}'".format(f.short_path) for f in _filter_js(depset(direct = ctx.files.srcs, transitive = integration_files).to_list())]

    ctx.actions.expand_template(
        output = ctx.outputs.plugin,
        template = ctx.file._plugin_template,
        substitutions = {
            "TEMPLATED_@cypress/browserify-preprocessor": "${cwd}/../cypress_deps/node_modules/@cypress/browserify-preprocessor/index",
            "TEMPLATED_includeScreenshots": "true" if ctx.attr.include_screenshots else "false",
            "TEMPLATED_includeVideos": "true" if ctx.attr.include_video else "false",
            "TEMPLATED_integrationFileShortPaths": "[\n  {files}\n]".format(files = ",\n  ".join(integration_files_short_paths)),
            "TEMPLATED_pluginsFile": plugins_file.short_path,
        },
    )

    return [DefaultInfo(
        files = depset([ctx.outputs.plugin]),
    )]

# Avoid using non-normalized paths (workspace/../other_workspace/path)
def _to_manifest_path(ctx, file):
    if file.short_path.startswith("../"):
        return file.short_path[3:]
    else:
        return ctx.workspace_name + "/" + file.short_path

_cypress_plugin = rule(
    implementation = _cypress_plugin_impl,
    outputs = {"plugin": "%{name}_cypress_plugin.js"},
    attrs = {
        "config_file": attr.label(
            allow_single_file = [".json"],
            mandatory = True,
        ),
        "include_screenshots": attr.bool(default = False),
        "include_video": attr.bool(default = False),
        "plugins_file": attr.label(
            default = Label("@build_bazel_rules_nodejs//packages/cypress:internal/plugins/base.js"),
            allow_single_file = True,
        ),
        "srcs": attr.label_list(
            doc = "A list of JavaScript test files",
            allow_files = True,
        ),
        # Unused by this rule, but here to require that a user supplies one for the downstream nodejs_test
        "_plugin_template": attr.label(
            default = Label("@build_bazel_rules_nodejs//packages/cypress:internal/plugins/index.template.js"),
            allow_single_file = True,
        ),
    },
)

def cypress_web_test(
        name,
        config_file,
        srcs = [],
        include_screenshots = False,
        include_video = False,
        plugins_file = Label("@build_bazel_rules_nodejs//packages/cypress:internal/plugins/base.js"),
        cypress = Label("TEMPLATED_node_modules_workspace_name//cypress:cypress"),
        cypress_browserify_preprocessor = Label("TEMPLATED_node_modules_workspace_name//@cypress/browserify-preprocessor"),
        data = [],
        templated_args = [],
        cypress_cache = Label("//:cypress_cache"),
        cypress_executable = Label("//:cypress_executable"),
        **kwargs):
    cypress_plugin = "{name}_cypress_plugin".format(name = name)
    tags = kwargs.pop("tags", []) + ["cypress"]

    _cypress_plugin(
        name = cypress_plugin,
        srcs = srcs,
        tags = tags,
        include_screenshots = include_screenshots,
        include_video = include_video,
        plugins_file = plugins_file,
        config_file = config_file,
        testonly = True,
        visibility = ["//visibility:private"],
    )

    nodejs_test(
        name = name,
        tags = tags,
        data = data + [
            plugins_file,
            cypress,
            cypress_browserify_preprocessor,
            cypress_cache,
            cypress_executable,
            ":{cypress_plugin}".format(cypress_plugin = cypress_plugin),
            ":{config_file}".format(config_file = config_file),
        ] + srcs,
        entry_point = "@build_bazel_rules_nodejs//packages/cypress:internal/run-cypress.js",
        templated_args = [
            "--nobazel_patch_module_resolver",
            "$(rootpath :{config_file})".format(config_file = config_file),
            "$(rootpath :{cypress_plugin})".format(cypress_plugin = cypress_plugin),
            "$(rootpath {cypress_executable})".format(cypress_executable = cypress_executable),
        ] + templated_args,
        **kwargs
    )

def cypress_web_test_global_cache(
        name,
        config_file,
        srcs = [],
        include_screenshots = False,
        include_video = False,
        plugins_file = Label("@build_bazel_rules_nodejs//packages/cypress:plugins/base.js"),
        cypress = Label("TEMPLATED_node_modules_workspace_name//cypress:cypress"),
        cypress_browserify_preprocessor = Label("TEMPLATED_node_modules_workspace_name//@cypress/browserify-preprocessor"),
        data = [],
        templated_args = [],
        **kwargs):
    cypress_plugin = "{name}_cypress_plugin".format(name = name)
    tags = kwargs.pop("tags", []) + ["cypress"]

    _cypress_plugin(
        name = cypress_plugin,
        srcs = srcs,
        tags = tags,
        include_screenshots = include_screenshots,
        include_video = include_video,
        plugins_file = plugins_file,
        config_file = config_file,
        testonly = True,
        visibility = ["//visibility:private"],
    )

    nodejs_test(
        name = name,
        tags = tags,
        data = data + [
            plugins_file,
            cypress,
            cypress_browserify_preprocessor,
            ":{cypress_plugin}".format(cypress_plugin = cypress_plugin),
            ":{config_file}".format(config_file = config_file),
        ] + srcs,
        entry_point = "@build_bazel_rules_nodejs//packages/cypress:internal/run-cypress.js",
        templated_args = [
            "--nobazel_patch_module_resolver",
            "$(rootpath :{config_file})".format(config_file = config_file),
            "$(rootpath :{cypress_plugin})".format(cypress_plugin = cypress_plugin),
        ] + templated_args,
        **kwargs
    )

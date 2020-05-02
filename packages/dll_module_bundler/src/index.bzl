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

"""Bundle node modules as UMD modules to be loaded at runtime under Bazel.
"""

load("@build_bazel_rules_nodejs//:providers.bzl", "NpmPackageInfo", "run_node")

def _dll_module_bundler_impl(ctx):
    # Bundles a list of node_modules as UMDs to be loaded at runtime.

    dll_targets = ctx.attr.dll_modules
    if len(dll_targets) == 0:
        fail("No dll_modules were specified to be bundled")

    module_paths = [target.label.package for target in dll_targets]

    imports = "\n".join(['import * as M{index} from "{path}";'.format(
        index = index,
        path = path,
    ) for index, path in enumerate(module_paths)])
    module_path_to_import_map = "\n  ".join(['"{path}": M{index},'.format(
        index = index,
        path = path,
    ) for index, path in enumerate(module_paths)])

    dll_loader = ctx.actions.declare_file(ctx.attr.name + "_dll_loader.js")
    ctx.actions.expand_template(
        template = ctx.file._dll_loader_template,
        output = dll_loader,
        substitutions = {
            "// TEMPLATED_imports": imports,
            "// TEMPLATED_module_path_to_import_map": module_path_to_import_map,
        },
    )

    deps_depsets = []
    for dep in ctx.attr.dll_modules:
        deps_depsets.append(dep[NpmPackageInfo].sources)
    deps_inputs = depset(transitive = deps_depsets).to_list()

    run_node(
        ctx = ctx,
        inputs = [dll_loader, ctx.file.webpack_config] + deps_inputs,
        executable = "webpack_cli",
        outputs = [ctx.outputs.dll_bundle],
        arguments = [
            dll_loader.path,
            "--config",
            ctx.file.webpack_config.path,
            "-o",
            ctx.outputs.dll_bundle.path,
        ],
        progress_message = "Bundling node module DLLs %s [webpack]" % ctx.outputs.dll_bundle.short_path,
    )

    return [DefaultInfo(
        files = depset([ctx.outputs.dll_bundle]),
    )]

dll_module_bundler = rule(
    attrs = {
        # List of node_modules to include in the DLL bundle.
        "dll_modules": attr.label_list(
            providers = [NpmPackageInfo],
            mandatory = True,
        ),
        "webpack_cli": attr.label(
            # This default assumes that users name their install "npm"
            default = Label("@npm//webpack-cli/bin:webpack-cli"),
            executable = True,
            cfg = "host",
        ),
        # Webpack config with plugins needed to bundle node_modules.
        "webpack_config": attr.label(
            default = Label("@npm_bazel_dll_module_bundler//:webpack.config.js"),
            allow_single_file = True,
        ),
        "_dll_loader_template": attr.label(
            allow_single_file = True,
            default = Label("@npm_bazel_dll_module_bundler//:dll_loader_template.js"),
        ),
    },
    outputs = {"dll_bundle": "%{name}.js"},
    implementation = _dll_module_bundler_impl,
)

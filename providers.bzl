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

"""Public providers, aspects and helper surface is re-exported here.

Users should not load files under "/internal"
"""

load(
    "//internal/providers:declaration_info.bzl",
    _DeclarationInfo = "DeclarationInfo",
    _declaration_info = "declaration_info",
)
load(
    "//internal/providers:external_npm_package_info.bzl",
    _ExternalNpmPackageInfo = "ExternalNpmPackageInfo",
    _node_modules_aspect = "node_modules_aspect",
)
load(
    "//internal/providers:js_providers.bzl",
    _JSEcmaScriptModuleInfo = "JSEcmaScriptModuleInfo",
    _JSModuleInfo = "JSModuleInfo",
    _JSNamedModuleInfo = "JSNamedModuleInfo",
    _js_ecma_script_module_info = "js_ecma_script_module_info",
    _js_module_info = "js_module_info",
    _js_named_module_info = "js_named_module_info",
)
load(
    "//internal/providers:linkable_package_info.bzl",
    _LinkablePackageInfo = "LinkablePackageInfo",
)
load(
    "//internal/providers:node_runtime_deps_info.bzl",
    _NodeRuntimeDepsInfo = "NodeRuntimeDepsInfo",
    _run_node = "run_node",
)

DeclarationInfo = _DeclarationInfo
declaration_info = _declaration_info
JSModuleInfo = _JSModuleInfo
js_module_info = _js_module_info
JSNamedModuleInfo = _JSNamedModuleInfo
js_named_module_info = _js_named_module_info
JSEcmaScriptModuleInfo = _JSEcmaScriptModuleInfo
js_ecma_script_module_info = _js_ecma_script_module_info
ExternalNpmPackageInfo = _ExternalNpmPackageInfo

# Export NpmPackageInfo for pre-3.0 legacy support in downstream rule sets
# such as rules_docker
# TODO(4.0): remove NpmPackageInfo
NpmPackageInfo = _ExternalNpmPackageInfo
node_modules_aspect = _node_modules_aspect
LinkablePackageInfo = _LinkablePackageInfo

#Modelled after _GoContextData in rules_go/go/private/context.bzl
NodeContextInfo = provider(
    doc = "Provides data about the build context, like config_setting's",
    fields = {
        "stamp": "If stamping is enabled",
    },
)

NODE_CONTEXT_ATTRS = {
    "node_context_data": attr.label(
        default = "@build_bazel_rules_nodejs//internal:node_context_data",
        providers = [NodeContextInfo],
        doc = """Provides info about the build context, such as stamping.
        
By default it reads from the bazel command line, such as the `--stamp` argument.
Use this to override values for this target, such as enabling or disabling stamping.
You can use the `node_context_data` rule in `@build_bazel_rules_nodejs//internal/node:context.bzl`
to create a NodeContextInfo.
""",
    ),
}

NodeRuntimeDepsInfo = _NodeRuntimeDepsInfo
run_node = _run_node

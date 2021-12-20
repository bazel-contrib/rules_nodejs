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

"""
Public providers, aspects and helpers that are shipped in the built-in build_bazel_rules_nodejs repository.

Users should not load files under "/internal"
"""

load(
    "//nodejs/private/providers:declaration_info.bzl",
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
    "//nodejs/private/providers:linkable_package_info.bzl",
    _LinkablePackageInfo = "LinkablePackageInfo",
)
load(
    "//internal/providers:node_runtime_deps_info.bzl",
    _NodeRuntimeDepsInfo = "NodeRuntimeDepsInfo",
    _run_node = "run_node",
)
load(
    "//nodejs/private/providers:directory_file_path_info.bzl",
    _DirectoryFilePathInfo = "DirectoryFilePathInfo",
)
load(
    "//nodejs/private/providers:stamp_setting_info.bzl",
    _StampSettingInfo = "StampSettingInfo",
)

StampSettingInfo = _StampSettingInfo
STAMP_ATTR = attr.label(
    default = "@build_bazel_rules_nodejs//nodejs:use_stamp_flag",
    providers = [StampSettingInfo],
    doc = """Whether to encode build information into the output. Possible values:
    - `@build_bazel_rules_nodejs//nodejs:always_stamp`:
        Always stamp the build information into the output, even in [--nostamp][stamp] builds.
        This setting should be avoided, since it potentially causes cache misses remote caching for
        any downstream actions that depend on it.
    - `@build_bazel_rules_nodejs//nodejs:never_stamp`:
        Always replace build information by constant values. This gives good build result caching.
    - `@build_bazel_rules_nodejs//nodejs:use_stamp_flag`:
        Embedding of build information is controlled by the [--[no]stamp][stamp] flag.
        Stamped binaries are not rebuilt unless their dependencies change.
    [stamp]: https://docs.bazel.build/versions/main/user-manual.html#flag--stamp""",
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
NodeRuntimeDepsInfo = _NodeRuntimeDepsInfo
run_node = _run_node
DirectoryFilePathInfo = _DirectoryFilePathInfo

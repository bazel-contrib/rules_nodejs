# Copyright 2018 The Bazel Authors. All rights reserved.
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

"""This module implements the node toolchain rule.
"""

NodeInfo = provider(
    doc = "Information about how to invoke Node.js and npm.",
    fields = {
        "node": """Node.js executable

If set, node_path will not be set.""",
        "node_path": """Path to Node.js executable; typically an absolute path to a non-hermetic Node.js.

If set, node will not be set.""",
        "npm": """Npm JavaScript entry point File

For backward compability, if set then npm_path will be set to the runfiles path of npm.
""",
        "npm_path": """Path to npm JavaScript entry point; typically an absolute path to a non-hermetic Node.js.

For backward compability, npm_path is set to the runfiles path of npm if npm is set.
""",
        "npm_files": """Additional files required to run npm""",
        "headers": """\
(struct) Information about the header files, with fields:
  * providers_map: a dict of string to provider instances. The key should be
    a fully qualified name (e.g. `@rules_foo//bar:baz.bzl#MyInfo`) of the
    provider to uniquely identify its type.

    The following keys are always present:
      * CcInfo: the CcInfo provider instance for the headers.
      * DefaultInfo: the DefaultInfo provider instance for the headers.

    A map is used to allow additional providers from the originating headers
    target (typically a `cc_library`) to be propagated to consumers (directly
    exposing a Target object can cause memory issues and is an anti-pattern).

    When consuming this map, it's suggested to use `providers_map.values()` to
    return all providers; or copy the map and filter out or replace keys as
    appropriate. Note that any keys begining with `_` (underscore) are
    considered private and should be forward along as-is (this better allows
    e.g. `:current_node_cc_headers` to act as the underlying headers target it
    represents).
""",
        # DEPRECATED
        "target_tool_path": "(DEPRECATED) Path to Node.js executable for backward compatibility",
        "tool_files": """(DEPRECATED) Alias for [node] for backward compatibility""",
    },
)

# Avoid using non-normalized paths (workspace/../other_workspace/path)
def _to_manifest_path(ctx, file):
    if file.short_path.startswith("../"):
        return "external/" + file.short_path[3:]
    else:
        return ctx.workspace_name + "/" + file.short_path

def _nodejs_toolchain_impl(ctx):
    if ctx.attr.node and ctx.attr.node_path:
        fail("Can only set one of node or node_path but both were set.")
    if not ctx.attr.node and not ctx.attr.node_path:
        fail("Must set one of node or node_path.")
    if ctx.attr.npm and ctx.attr.npm_path:
        fail("Can only set one of npm or npm_path but both were set.")

    # Make the $(NODE_PATH) variable available in places like genrules.
    # See https://docs.bazel.build/versions/main/be/make-variables.html#custom_variables
    template_variables = platform_common.TemplateVariableInfo({
        "NODE_PATH": ctx.file.node.path if ctx.attr.node else ctx.attr.node_path,
        "NPM_PATH": ctx.file.npm.path if ctx.attr.npm else ctx.attr.npm_path,
    })
    default = DefaultInfo(
        files = depset([ctx.file.node]) if ctx.attr.node else depset(),
        runfiles = ctx.runfiles(files = [ctx.file.node] if ctx.attr.node else []),
    )
    nodeinfo = NodeInfo(
        node = ctx.file.node,
        node_path = ctx.attr.node_path,
        npm = ctx.file.npm,
        npm_path = ctx.attr.npm_path if ctx.attr.npm_path else _to_manifest_path(ctx, ctx.file.npm),  # _to_manifest_path for backward compat
        npm_files = depset([ctx.file.npm] + ctx.files.npm_files).to_list() if ctx.attr.npm else [],
        headers = struct(
            providers_map = {
                "CcInfo": ctx.attr.headers[CcInfo],
                "DefaultInfo": ctx.attr.headers[DefaultInfo],
            },
        ) if ctx.attr.headers else None,
        # For backward compat
        target_tool_path = _to_manifest_path(ctx, ctx.file.node) if ctx.attr.node else ctx.attr.node_path,
        tool_files = [ctx.file.node] if ctx.attr.node else [],
    )

    # Export all the providers inside our ToolchainInfo
    # so the resolved_toolchain rule can grab and re-export them.
    toolchain_info = platform_common.ToolchainInfo(
        nodeinfo = nodeinfo,
        template_variables = template_variables,
        default = default,
    )
    return [
        default,
        toolchain_info,
        template_variables,
    ]

_nodejs_toolchain = rule(
    implementation = _nodejs_toolchain_impl,
    attrs = {
        "node": attr.label(
            executable = True,
            cfg = "exec",
            allow_single_file = True,
        ),
        "node_path": attr.string(),
        "npm": attr.label(allow_single_file = True),
        "npm_path": attr.string(),
        "npm_files": attr.label_list(),
        "headers": attr.label(),
    },
)

def node_toolchain(
        name,
        node = None,
        node_path = "",
        npm = None,
        npm_path = "",
        npm_files = [],
        headers = None,
        **kwargs):
    """Defines a node toolchain for a platform.

    You can use this to refer to a vendored nodejs binary in your repository,
    or even to compile nodejs from sources using rules_foreign_cc or other rules.

    First, in a BUILD.bazel file, create a node_toolchain definition:

    ```starlark
    load("@rules_nodejs//nodejs:toolchain.bzl", "node_toolchain")

    node_toolchain(
        name = "node_toolchain",
        node = "//some/path/bin/node",
    )
    ```

    Next, declare which execution platforms or target platforms the toolchain should be selected for
    based on constraints.

    ```starlark
    toolchain(
        name = "my_nodejs",
        exec_compatible_with = [
            "@platforms//os:linux",
            "@platforms//cpu:x86_64",
        ],
        toolchain = ":node_toolchain",
        toolchain_type = "@rules_nodejs//nodejs:toolchain_type",
    )
    ```

    See https://bazel.build/extending/toolchains#toolchain-resolution for more information on toolchain
    resolution.

    Finally in your `WORKSPACE`, register it with `register_toolchains("//:my_nodejs")`

    For usage see https://docs.bazel.build/versions/main/toolchains.html#defining-toolchains.
    You can use the `--toolchain_resolution_debug` flag to `bazel` to help diagnose which toolchain is selected.

    Args:
        name: Unique name for this target

        node: Node.js executable

        node_path: Path to Node.js executable file

            This is typically an absolute path to a non-hermetic Node.js executable.

            Only one of `node` and `node_path` may be set.

        npm: Npm JavaScript entry point

        npm_path: Path to npm JavaScript entry point

            This is typically an absolute path to a non-hermetic npm installation.

            Only one of `npm` and `npm_path` may be set.

        npm_files: Additional files required to run npm

            Not necessary if specifying `npm_path` to a non-hermetic npm installation.

        headers: cc_library that contains the Node/v8 header files

        **kwargs: Additional parameters
    """
    target_tool = kwargs.pop("target_tool", None)
    if target_tool:
        # buildifier: disable=print
        print("""\
WARNING: target_tool attribute of node_toolchain is deprecated; use node instead of target_tool.

If your are not calling node_toolchain directly you may need to upgrade to rules_js 2.x to suppress this warning.
""")
        node = target_tool

    target_tool_path = kwargs.pop("target_tool_path", "")
    if target_tool_path:
        # buildifier: disable=print
        print("""\
WARNING: target_tool_path attribute of node_toolchain is deprecated; use node_path instead of target_tool_path
""")
        node_path = target_tool_path

    _nodejs_toolchain(
        name = name,
        node = node,
        node_path = node_path,
        npm = npm,
        npm_path = npm_path,
        npm_files = npm_files,
        headers = headers,
        **kwargs
    )

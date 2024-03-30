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
    doc = "Information about how to invoke the node executable.",
    fields = {
        "node": "Node.js executable File",
        "node_path": "Path to Node.js executable; if set then 'node' is ignored",
        "npm": "Npm JavaScript entry point File",
        "npm_path": "Path to npm JavaScript entry point",
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
    },
)

def _node_toolchain_impl(ctx):
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
        npm_path = ctx.attr.npm_path,
        npm_files = depset([ctx.file.npm] + ctx.files.npm_files) if ctx.attr.npm else depset(),
        headers = struct(
            providers_map = {
                "CcInfo": ctx.attr.headers[CcInfo],
                "DefaultInfo": ctx.attr.headers[DefaultInfo],
            },
        ) if ctx.attr.headers else None,
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

node_toolchain = rule(
    implementation = _node_toolchain_impl,
    attrs = {
        "node": attr.label(
            doc = "Node.js executable",
            executable = True,
            cfg = "exec",
            allow_single_file = True,
        ),
        "node_path": attr.string(
            doc = "Path to Node.js executable file",
        ),
        "npm": attr.label(
            doc = "Npm JavaScript entry point",
            allow_single_file = True,
        ),
        "npm_path": attr.string(
            doc = "Path to npm JavaScript entry point",
        ),
        "npm_files": attr.label_list(
            doc = "Additional files required to run npm",
        ),
        "headers": attr.label(
            doc = "cc_library that contains the Node/v8 header files",
        ),
    },
    doc = """Defines a node toolchain for a platform.

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
""",
)

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

"""Executing programs

These rules run the node binary with the given sources.

They support module mapping: any targets in the transitive dependencies with
a `module_name` attribute can be `require`d by that name.
"""

load("@build_bazel_rules_nodejs//internal/common:node_module_info.bzl", "NodeModuleSources", "collect_node_modules_aspect")
load("//internal/common:expand_into_runfiles.bzl", "expand_location_into_runfiles", "expand_path_into_runfiles")
load("//internal/common:module_mappings.bzl", "module_mappings_runtime_aspect")
load("//internal/common:sources_aspect.bzl", "sources_aspect")

def _trim_package_node_modules(package_name):
    # trim a package name down to its path prior to a node_modules
    # segment. 'foo/node_modules/bar' would become 'foo' and
    # 'node_modules/bar' would become ''
    segments = []
    for n in package_name.split("/"):
        if n == "node_modules":
            break
        segments += [n]
    return "/".join(segments)

def _compute_node_modules_root(ctx):
    """Computes the node_modules root from the node_modules and deps attributes.

    Args:
      ctx: the skylark execution context

    Returns:
      The node_modules root as a string
    """
    node_modules_root = None
    if ctx.attr.node_modules:
        if NodeModuleSources in ctx.attr.node_modules:
            node_modules_root = "/".join([ctx.attr.node_modules[NodeModuleSources].workspace, "node_modules"])
        elif ctx.files.node_modules:
            # ctx.files.node_modules is not an empty list
            workspace = ctx.attr.node_modules.label.workspace_root.split("/")[1] if ctx.attr.node_modules.label.workspace_root else ctx.workspace_name
            node_modules_root = "/".join([f for f in [
                workspace,
                _trim_package_node_modules(ctx.attr.node_modules.label.package),
                "node_modules",
            ] if f])
    for d in ctx.attr.data:
        if NodeModuleSources in d:
            possible_root = "/".join([d[NodeModuleSources].workspace, "node_modules"])
            if not node_modules_root:
                node_modules_root = possible_root
            elif node_modules_root != possible_root:
                fail("All npm dependencies need to come from a single workspace. Found '%s' and '%s'." % (node_modules_root, possible_root))
    if not node_modules_root:
        # there are no fine grained deps and the node_modules attribute is an empty filegroup
        # but we still need a node_modules_root even if its empty
        workspace = ctx.attr.node_modules.label.workspace_root.split("/")[1] if ctx.attr.node_modules.label.workspace_root else ctx.workspace_name
        node_modules_root = "/".join([f for f in [
            workspace,
            ctx.attr.node_modules.label.package,
            "node_modules",
        ] if f])
    return node_modules_root

def _write_loader_script(ctx):
    # Generates the JavaScript snippet of module roots mappings, with each entry
    # in the form:
    #   {module_name: /^mod_name\b/, module_root: 'path/to/mod_name'}
    module_mappings = []
    for d in ctx.attr.data:
        if hasattr(d, "runfiles_module_mappings"):
            for [mn, mr] in d.runfiles_module_mappings.items():
                escaped = mn.replace("/", "\/").replace(".", "\.")
                mapping = "{module_name: /^%s\\b/, module_root: '%s'}" % (escaped, mr)
                module_mappings.append(mapping)

    node_modules_root = _compute_node_modules_root(ctx)

    if len(ctx.attr.entry_point.files.to_list()) != 1:
        fail("labels in entry_point must contain exactly one file")

    entry_point_path = expand_path_into_runfiles(ctx, ctx.file.entry_point.short_path)

    # If the entry point specified is a typescript file then set the entry
    # point to the corresponding .js file
    if entry_point_path.endswith(".ts"):
        entry_point_path = entry_point_path[:-3] + ".js"

    ctx.actions.expand_template(
        template = ctx.file._loader_template,
        output = ctx.outputs.loader,
        substitutions = {
            "TEMPLATED_bin_dir": ctx.bin_dir.path,
            "TEMPLATED_bootstrap": "\n  " + ",\n  ".join(
                ["\"" + d + "\"" for d in ctx.attr.bootstrap],
            ),
            "TEMPLATED_entry_point": entry_point_path,
            "TEMPLATED_gen_dir": ctx.genfiles_dir.path,
            "TEMPLATED_install_source_map_support": str(ctx.attr.install_source_map_support).lower(),
            "TEMPLATED_module_roots": "\n  " + ",\n  ".join(module_mappings),
            "TEMPLATED_node_modules_root": node_modules_root,
            "TEMPLATED_target": str(ctx.label),
            "TEMPLATED_user_workspace_name": ctx.workspace_name,
        },
        is_executable = True,
    )

def _short_path_to_manifest_path(ctx, short_path):
    if short_path.startswith("../"):
        return short_path[3:]
    else:
        return ctx.workspace_name + "/" + short_path

def _nodejs_binary_impl(ctx):
    node_modules = depset(ctx.files.node_modules)

    # Also include files from npm fine grained deps as inputs.
    # These deps are identified by the NodeModuleSources provider.
    for d in ctx.attr.data:
        if NodeModuleSources in d:
            node_modules = depset(transitive = [node_modules, d[NodeModuleSources].sources])

    # Using a depset will allow us to avoid flattening files and sources
    # inside this loop. This should reduce the performances hits,
    # since we don't need to call .to_list()
    sources = depset()

    for d in ctx.attr.data:
        if hasattr(d, "node_sources"):
            sources = depset(transitive = [sources, d.node_sources])
        if hasattr(d, "files"):
            sources = depset(transitive = [sources, d.files])

    _write_loader_script(ctx)

    # Avoid writing non-normalized paths (workspace/../other_workspace/path)
    if ctx.outputs.loader.short_path.startswith("../"):
        script_path = ctx.outputs.loader.short_path[len("../"):]
    else:
        script_path = "/".join([
            ctx.workspace_name,
            ctx.outputs.loader.short_path,
        ])
    env_vars = "export BAZEL_TARGET=%s\n" % ctx.label
    for k in ctx.attr.configuration_env_vars:
        if k in ctx.var.keys():
            env_vars += "export %s=\"%s\"\n" % (k, ctx.var[k])

    expected_exit_code = 0
    if hasattr(ctx.attr, "expected_exit_code"):
        expected_exit_code = ctx.attr.expected_exit_code

    node_tool_info = ctx.toolchains["@build_bazel_rules_nodejs//toolchains/node:toolchain_type"].nodeinfo
    node_tool_files = []
    if node_tool_info.target_tool_path == "" and not node_tool_info.target_tool:
        # If tool_path is empty and tool_target is None then there is no local
        # node tool, we will just print a nice error message if the user
        # attempts to do bazel run
        ctx.actions.write(
            content = ("echo node toolchain was not properly configured so %s cannot be executed." % ctx.attr.name),
            output = ctx.outputs.script,
        )
    else:
        node_tool = node_tool_info.target_tool_path
        if node_tool_info.target_tool:
            node_tool_files += node_tool_info.target_tool.files.to_list()
            node_tool = _short_path_to_manifest_path(ctx, node_tool_files[0].short_path)

        substitutions = {
            "TEMPLATED_args": " ".join([
                expand_location_into_runfiles(ctx, a)
                for a in ctx.attr.templated_args
            ]),
            "TEMPLATED_env_vars": env_vars,
            "TEMPLATED_expected_exit_code": str(expected_exit_code),
            "TEMPLATED_node": node_tool,
            "TEMPLATED_repository_args": _short_path_to_manifest_path(ctx, ctx.file._repository_args.short_path),
            "TEMPLATED_script_path": script_path,
        }
        ctx.actions.expand_template(
            template = ctx.file._launcher_template,
            output = ctx.outputs.script,
            substitutions = substitutions,
            is_executable = True,
        )

    runfiles = depset(node_tool_files + [ctx.outputs.loader, ctx.file._repository_args], transitive = [sources, node_modules])

    # entry point is only needed in runfiles if it is a .js file
    if ctx.file.entry_point.extension == "js":
        runfiles = depset([ctx.file.entry_point], transitive = [runfiles])

    return [DefaultInfo(
        executable = ctx.outputs.script,
        runfiles = ctx.runfiles(
            transitive_files = runfiles,
            files = node_tool_files + [
                        ctx.outputs.loader,
                    ] + ctx.files._source_map_support_files +

                    # We need this call to the list of Files.
                    # Calling the .to_list() method may have some perfs hits,
                    # so we should be running this method only once per rule.
                    # see: https://docs.bazel.build/versions/master/skylark/depsets.html#performance
                    node_modules.to_list() + sources.to_list(),
            collect_data = True,
        ),
    )]

_NODEJS_EXECUTABLE_ATTRS = {
    "bootstrap": attr.string_list(
        doc = """JavaScript modules to be loaded before the entry point.
        For example, Angular uses this to patch the Jasmine async primitives for
        zone.js before the first `describe`.
        """,
        default = [],
    ),
    "configuration_env_vars": attr.string_list(
        doc = """Pass these configuration environment variables to the resulting binary.
        Chooses a subset of the configuration environment variables (taken from ctx.var), which also
        includes anything specified via the --define flag.
        Note, this can lead to different outputs produced by this rule.""",
        default = [],
    ),
    "data": attr.label_list(
        doc = """Runtime dependencies which may be loaded during execution.""",
        allow_files = True,
        aspects = [sources_aspect, module_mappings_runtime_aspect, collect_node_modules_aspect],
    ),
    "entry_point": attr.label(
        doc = """The script which should be executed first, usually containing a main function.

        If the entry JavaScript file belongs to the same package (as the BUILD file), 
        you can simply reference it by its relative name to the package directory:

        ```
        nodejs_binary(
            name = "my_binary",
            ...
            entry_point = ":file.js",
        )
        ```

        You can specify the entry point as a typescript file so long as you also include
        the ts_library target in data:

        ```
        ts_library(
            name = "main",
            srcs = ["main.ts"],
        )

        nodejs_binary(
            name = "bin",
            data = [":main"]
            entry_point = ":main.ts",
        )
        ```

        The rule will use the corresponding `.js` output of the ts_library rule as the entry point.

        If the entry point target is a rule, it should produce a single JavaScript entry file that will be passed to the nodejs_binary rule. 
        For example:

        ```
        filegroup(
            name = "entry_file",
            srcs = ["main.js"],
        )

        nodejs_binary(
            name = "my_binary",
            entry_point = ":entry_file",
        )
        ```

        The entry_point can also be a label in another workspace:

        ```
        nodejs_binary(
            name = "history-server",
            entry_point = "@npm//:node_modules/history-server/modules/cli.js",
            data = ["@npm//history-server"],
        )
        ```
        """,
        mandatory = True,
        allow_single_file = True,
    ),
    "install_source_map_support": attr.bool(
        doc = """Install the source-map-support package.
        Enable this to get stack traces that point to original sources, e.g. if the program was written
        in TypeScript.""",
        default = True,
    ),
    "node_modules": attr.label(
        doc = """The npm packages which should be available to `require()` during
        execution.

        This attribute is DEPRECATED. As of version 0.13.0 the recommended approach
        to npm dependencies is to use fine grained npm dependencies which are setup
        with the `yarn_install` or `npm_install` rules. For example, in targets
        that used a `//:node_modules` filegroup,

        ```
        nodejs_binary(
          name = "my_binary",
          ...
          node_modules = "//:node_modules",
        )
        ```

        which specifies all files within the `//:node_modules` filegroup
        to be inputs to the `my_binary`. Using fine grained npm dependencies,
        `my_binary` is defined with only the npm dependencies that are
        needed:

        ```
        nodejs_binary(
          name = "my_binary",
          ...
          data = [
              "@npm//foo",
              "@npm//bar",
              ...
          ],
        )
        ```

        In this case, only the `foo` and `bar` npm packages and their
        transitive deps are includes as inputs to the `my_binary` target
        which reduces the time required to setup the runfiles for this
        target (see https://github.com/bazelbuild/bazel/issues/5153).

        The @npm external repository and the fine grained npm package
        targets are setup using the `yarn_install` or `npm_install` rule
        in your WORKSPACE file:

        yarn_install(
          name = "npm",
          package_json = "//:package.json",
          yarn_lock = "//:yarn.lock",
        )

        For other rules such as `jasmine_node_test`, fine grained
        npm dependencies are specified in the `deps` attribute:

        ```
        jasmine_node_test(
            name = "my_test",
            ...
            deps = [
                "@npm//jasmine",
                "@npm//foo",
                "@npm//bar",
                ...
            ],
        )
        ```
        """,
        default = Label("//:node_modules_none"),
    ),
    "templated_args": attr.string_list(
        doc = """Arguments which are passed to every execution of the program.
        To pass a node startup option, prepend it with `--node_options=`, e.g.
        `--node_options=--preserve-symlinks`
        """,
    ),
    "_launcher_template": attr.label(
        default = Label("//internal/node:node_launcher.sh"),
        allow_single_file = True,
    ),
    "_loader_template": attr.label(
        default = Label("//internal/node:node_loader.js"),
        allow_single_file = True,
    ),
    "_repository_args": attr.label(
        default = Label("@nodejs//:bin/node_repo_args.sh"),
        allow_single_file = True,
    ),
    "_source_map_support_files": attr.label_list(
        default = [
            Label("//third_party/github.com/buffer-from:contents"),
            Label("//third_party/github.com/source-map:contents"),
            Label("//third_party/github.com/source-map-support:contents"),
        ],
        allow_files = True,
    ),
}

_NODEJS_EXECUTABLE_OUTPUTS = {
    "loader": "%{name}_loader.js",
    "script": "%{name}.sh",
}

# The name of the declared rule appears in
# bazel query --output=label_kind
# So we make these match what the user types in their BUILD file
# and duplicate the definitions to give two distinct symbols.
nodejs_binary = rule(
    implementation = _nodejs_binary_impl,
    attrs = _NODEJS_EXECUTABLE_ATTRS,
    executable = True,
    outputs = _NODEJS_EXECUTABLE_OUTPUTS,
    toolchains = ["@build_bazel_rules_nodejs//toolchains/node:toolchain_type"],
)
"""Runs some JavaScript code in NodeJS.
"""

nodejs_test = rule(
    implementation = _nodejs_binary_impl,
    attrs = dict(_NODEJS_EXECUTABLE_ATTRS, **{
        "expected_exit_code": attr.int(
            doc = "The expected exit code for the test. Defaults to 0.",
            default = 0,
        ),
    }),
    test = True,
    outputs = _NODEJS_EXECUTABLE_OUTPUTS,
    toolchains = ["@build_bazel_rules_nodejs//toolchains/node:toolchain_type"],
)
"""
Identical to `nodejs_binary`, except this can be used with `bazel test` as well.
When the binary returns zero exit code, the test passes; otherwise it fails.

`nodejs_test` is a convenient way to write a novel kind of test based on running
your own test runner. For example, the `ts-api-guardian` library has a way to
assert the public API of a TypeScript program, and uses `nodejs_test` here:
https://github.com/angular/angular/blob/master/tools/ts-api-guardian/index.bzl

If you just want to run a standard test using a test runner like Karma or Jasmine,
use the specific rules for those test runners, e.g. `jasmine_node_test`.

To debug a Node.js test, we recommend saving a group of flags together in a "config".
Put this in your `tools/bazel.rc` so it's shared with your team:
```
# Enable debugging tests with --config=debug
test:debug --test_arg=--node_options=--inspect-brk --test_output=streamed --test_strategy=exclusive --test_timeout=9999 --nocache_test_results
```

Now you can add `--config=debug` to any `bazel test` command line.
The runtime will pause before executing the program, allowing you to connect a
remote debugger.
"""
# Adding the above nodejs_test & nodejs_binary docstrings as `doc` attributes
# causes a build error but ONLY on Ubuntu 14.04 on BazelCI.
# ```
# File "internal/node/node.bzl", line 378, in <module>
#     outputs = _NODEJS_EXECUTABLE_OUTPUTS,
# TypeError: rule() got an unexpected keyword argument 'doc'
# ```
# This error does not occur on any other platform on BazelCI including Ubuntu 16.04.
# TOOD(gregmagolan): Figure out why and/or file a bug to Bazel
# See https://github.com/bazelbuild/buildtools/issues/471#issuecomment-485283200

def nodejs_binary_macro(name, data = [], args = [], visibility = None, tags = [], testonly = 0, **kwargs):
    """This macro exists only to wrap the nodejs_binary as an .exe for Windows.

    This is exposed in the public API at `//:defs.bzl` as `nodejs_binary`, so most
    users loading `nodejs_binary` are actually executing this macro.

    Args:
      name: name of the label
      data: runtime dependencies
      args: applied to the wrapper binary
      visibility: applied to the wrapper binary
      tags: applied to the wrapper binary
      testonly: applied to nodejs_binary and wrapper binary
      **kwargs: passed to the nodejs_binary
    """
    all_data = data + ["@bazel_tools//tools/bash/runfiles"]

    nodejs_binary(
        name = "%s_bin" % name,
        data = all_data,
        testonly = testonly,
        visibility = ["//visibility:private"],
        **kwargs
    )

    native.sh_binary(
        name = name,
        args = args,
        tags = tags,
        srcs = [":%s_bin.sh" % name],
        data = [":%s_bin" % name],
        testonly = testonly,
        visibility = visibility,
    )

def nodejs_test_macro(name, data = [], args = [], visibility = None, tags = [], **kwargs):
    """This macro exists only to wrap the nodejs_test as an .exe for Windows.

    This is exposed in the public API at `//:defs.bzl` as `nodejs_test`, so most
    users loading `nodejs_test` are actually executing this macro.

    Args:
      name: name of the label
      data: runtime dependencies
      args: applied to the wrapper binary
      visibility: applied to the wrapper binary
      tags: applied to the wrapper binary
      **kwargs: passed to the nodejs_test
    """
    all_data = data + ["@bazel_tools//tools/bash/runfiles"]

    nodejs_test(
        name = "%s_bin" % name,
        data = all_data,
        testonly = 1,
        tags = ["manual"],
        **kwargs
    )

    native.sh_test(
        name = name,
        args = args,
        tags = tags,
        visibility = visibility,
        srcs = [":%s_bin.sh" % name],
        data = [":%s_bin" % name],
    )

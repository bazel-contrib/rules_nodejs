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

load("//internal/common:expand_into_runfiles.bzl", "expand_location_into_runfiles")
load("//internal/common:module_mappings.bzl", "module_mappings_runtime_aspect")
load("//internal/common:node_module_info.bzl", "NodeModuleInfo", "collect_node_modules_aspect")
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

    node_modules_root = None
    if ctx.files.node_modules:
        # ctx.files.node_modules is not an empty list
        workspace = ctx.attr.node_modules.label.workspace_root.split("/")[1] if ctx.attr.node_modules.label.workspace_root else ctx.workspace_name
        node_modules_root = "/".join([f for f in [
            workspace,
            _trim_package_node_modules(ctx.attr.node_modules.label.package),
            "node_modules",
        ] if f])
    for d in ctx.attr.data:
        if NodeModuleInfo in d:
            possible_root = "/".join([d[NodeModuleInfo].workspace, "node_modules"])
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

    ctx.actions.expand_template(
        template = ctx.file._loader_template,
        output = ctx.outputs.loader,
        substitutions = {
            "TEMPLATED_bin_dir": ctx.bin_dir.path,
            "TEMPLATED_bootstrap": "\n  " + ",\n  ".join(
                ["\"" + d + "\"" for d in ctx.attr.bootstrap],
            ),
            "TEMPLATED_entry_point": ctx.attr.entry_point,
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
    node = ctx.file.node
    node_modules = ctx.files.node_modules

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

    substitutions = {
        "TEMPLATED_args": " ".join([
            expand_location_into_runfiles(ctx, a)
            for a in ctx.attr.templated_args
        ]),
        "TEMPLATED_env_vars": env_vars,
        "TEMPLATED_expected_exit_code": str(expected_exit_code),
        "TEMPLATED_node": _short_path_to_manifest_path(ctx, node.short_path),
        "TEMPLATED_repository_args": _short_path_to_manifest_path(ctx, ctx.file._repository_args.short_path),
        "TEMPLATED_script_path": script_path,
    }
    ctx.actions.expand_template(
        template = ctx.file._launcher_template,
        output = ctx.outputs.script,
        substitutions = substitutions,
        is_executable = True,
    )

    runfiles = depset([node, ctx.outputs.loader, ctx.file._repository_args] + node_modules + ctx.files._node_runfiles, transitive = [sources])

    return [DefaultInfo(
        executable = ctx.outputs.script,
        runfiles = ctx.runfiles(
            transitive_files = runfiles,
            files = [
                        node,
                        ctx.outputs.loader,
                    ] + ctx.files._source_map_support_files + node_modules +

                    # We need this call to the list of Files.
                    # Calling the .to_list() method may have some perfs hits,
                    # so we should be running this method only once per rule.
                    # see: https://docs.bazel.build/versions/master/skylark/depsets.html#performance
                    sources.to_list(),
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
    "entry_point": attr.string(
        doc = """The script which should be executed first, usually containing a main function.
        This attribute expects a string starting with the workspace name, so that it's not ambiguous
        in cases where a script with the same name appears in another directory or external workspace.
        """,
        mandatory = True,
    ),
    "install_source_map_support": attr.bool(
        doc = """Install the source-map-support package.
        Enable this to get stack traces that point to original sources, e.g. if the program was written
        in TypeScript.""",
        default = True,
    ),
    "node": attr.label(
        doc = """The node entry point target.""",
        default = Label("@nodejs//:node"),
        allow_single_file = True,
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
    "_node_runfiles": attr.label(
        default = Label("@nodejs//:node_runfiles"),
        allow_files = True,
    ),
    "_repository_args": attr.label(
        default = Label("@nodejs//:bin/node_args.sh"),
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
)
"""
Runs some JavaScript code in NodeJS.
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

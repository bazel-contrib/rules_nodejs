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

These rules run the node executable with the given sources.

They support module mapping: any targets in the transitive dependencies with
a `module_name` attribute can be `require`d by that name.
"""

load("//:providers.bzl", "JSModuleInfo", "NodeRuntimeDepsInfo", "NpmPackageInfo", "node_modules_aspect")
load("//internal/common:expand_into_runfiles.bzl", "expand_location_into_runfiles")
load("//internal/common:module_mappings.bzl", "module_mappings_runtime_aspect")
load("//internal/common:path_utils.bzl", "strip_external")
load("//internal/common:preserve_legacy_templated_args.bzl", "preserve_legacy_templated_args")
load("//internal/common:windows_utils.bzl", "create_windows_native_launcher_script", "is_windows")
load("//internal/linker:link_node_modules.bzl", "module_mappings_aspect", "write_node_modules_manifest")
load("//internal/node:node_repositories.bzl", "BUILT_IN_NODE_PLATFORMS")

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
        if NpmPackageInfo in ctx.attr.node_modules:
            node_modules_root = "/".join([ctx.attr.node_modules[NpmPackageInfo].workspace, "node_modules"])
        elif ctx.files.node_modules:
            # ctx.files.node_modules is not an empty list
            workspace_name = ctx.attr.node_modules.label.workspace_name if ctx.attr.node_modules.label.workspace_name else ctx.workspace_name
            node_modules_root = "/".join([f for f in [
                workspace_name,
                _trim_package_node_modules(ctx.attr.node_modules.label.package),
                "node_modules",
            ] if f])
    for d in ctx.attr.data:
        if NpmPackageInfo in d:
            possible_root = "/".join([d[NpmPackageInfo].workspace, "node_modules"])
            if not node_modules_root:
                node_modules_root = possible_root
            elif node_modules_root != possible_root:
                fail("All npm dependencies need to come from a single workspace. Found '%s' and '%s'." % (node_modules_root, possible_root))
    if not node_modules_root:
        # there are no fine grained deps and the node_modules attribute is an empty filegroup
        # but we still need a node_modules_root even if its empty
        workspace_name = ctx.attr.node_modules.label.workspace_name if ctx.attr.node_modules.label.workspace_name else ctx.workspace_name
        node_modules_root = "/".join([f for f in [
            workspace_name,
            ctx.attr.node_modules.label.package,
            "node_modules",
        ] if f])
    return node_modules_root

def _write_require_patch_script(ctx, node_modules_root):
    # Generates the JavaScript snippet of module roots mappings, with each entry
    # in the form:
    #   {module_name: /^mod_name\b/, module_root: 'path/to/mod_name'}
    module_mappings = []
    for d in ctx.attr.data:
        if hasattr(d, "runfiles_module_mappings"):
            for [mn, mr] in d.runfiles_module_mappings.items():
                escaped = mn.replace("/", "\\/").replace(".", "\\.")
                mapping = "{module_name: /^%s\\b/, module_root: '%s'}" % (escaped, mr)
                module_mappings.append(mapping)

    ctx.actions.expand_template(
        template = ctx.file._require_patch_template,
        output = ctx.outputs.require_patch_script,
        substitutions = {
            "TEMPLATED_bin_dir": ctx.bin_dir.path,
            "TEMPLATED_gen_dir": ctx.genfiles_dir.path,
            "TEMPLATED_module_roots": "\n  " + ",\n  ".join(module_mappings),
            "TEMPLATED_node_modules_root": node_modules_root,
            "TEMPLATED_target": str(ctx.label),
            "TEMPLATED_user_workspace_name": ctx.workspace_name,
        },
        is_executable = True,
    )

def _write_loader_script(ctx):
    if len(ctx.attr.entry_point.files.to_list()) != 1:
        fail("labels in entry_point must contain exactly one file")

    entry_point_path = _to_manifest_path(ctx, ctx.file.entry_point)

    # If the entry point specified is a typescript file then set the entry
    # point to the corresponding .js file
    if entry_point_path.endswith(".ts"):
        entry_point_path = entry_point_path[:-3] + ".js"
    elif entry_point_path.endswith(".tsx"):
        entry_point_path = entry_point_path[:-4] + ".js"

    ctx.actions.expand_template(
        template = ctx.file._loader_template,
        output = ctx.outputs.loader_script,
        substitutions = {"TEMPLATED_entry_point": entry_point_path},
        is_executable = True,
    )

# Avoid using non-normalized paths (workspace/../other_workspace/path)
def _to_manifest_path(ctx, file):
    if file.short_path.startswith("../"):
        return file.short_path[3:]
    else:
        return ctx.workspace_name + "/" + file.short_path

def _to_execroot_path(ctx, file):
    parts = file.path.split("/")
    if parts[0] == "external":
        if parts[2] == "node_modules":
            # external/npm/node_modules -> node_modules/foo
            # the linker will make sure we can resolve node_modules from npm
            return "/".join(parts[2:])

    return file.path

def _nodejs_binary_impl(ctx):
    node_modules_manifest = write_node_modules_manifest(ctx)
    node_modules_depsets = []
    node_modules_depsets.append(depset(ctx.files.node_modules))
    if NpmPackageInfo in ctx.attr.node_modules:
        node_modules_depsets.append(ctx.attr.node_modules[NpmPackageInfo].sources)

    # Also include files from npm fine grained deps as inputs.
    # These deps are identified by the NpmPackageInfo provider.
    for d in ctx.attr.data:
        if NpmPackageInfo in d:
            node_modules_depsets.append(d[NpmPackageInfo].sources)

    node_modules = depset(transitive = node_modules_depsets)

    # Using an array of depsets will allow us to avoid flattening files and sources
    # inside this loop. This should reduce the performances hits,
    # since we don't need to call .to_list()
    # Also avoid deap transitive depset()s by creating single array of
    # transitive depset()s
    sources_depsets = []

    for d in ctx.attr.data:
        if JSModuleInfo in d:
            sources_depsets.append(d[JSModuleInfo].sources)
        if hasattr(d, "files"):
            sources_depsets.append(d.files)
    sources = depset(transitive = sources_depsets)

    node_modules_root = _compute_node_modules_root(ctx)

    _write_require_patch_script(ctx, node_modules_root)
    _write_loader_script(ctx)

    # Provide the target name as an environment variable avaiable to all actions for the
    # runfiles helpers to use.
    env_vars = "export BAZEL_TARGET=%s\n" % ctx.label

    # While we can derive the workspace from the pwd when running locally
    # because it is in the execroot path `execroot/my_wksp`, on RBE the
    # `execroot/my_wksp` path is reduced a path such as `/w/f/b` so
    # the workspace name is obfuscated from the path. So we provide the workspace
    # name here as an environment variable avaiable to all actions for the
    # runfiles helpers to use.
    env_vars += "export BAZEL_WORKSPACE=%s\n" % ctx.workspace_name

    # if BAZEL_NODE_MODULES_ROOT has not already been set by
    # run_node, then set it to the computed value
    env_vars += """if [[ -z "${BAZEL_NODE_MODULES_ROOT:-}" ]]; then
  export BAZEL_NODE_MODULES_ROOT=%s
fi
""" % node_modules_root

    for k in ctx.attr.configuration_env_vars + ctx.attr.default_env_vars:
        # Check ctx.var first & if env var not in there then check
        # ctx.configuration.default_shell_env. The former will contain values from --define=FOO=BAR
        # and latter will contain values from --action_env=FOO=BAR (but not from --action_env=FOO).
        if k in ctx.var.keys():
            env_vars += "export %s=\"%s\"\n" % (k, ctx.var[k])
        elif k in ctx.configuration.default_shell_env.keys():
            env_vars += "export %s=\"%s\"\n" % (k, ctx.configuration.default_shell_env[k])

    expected_exit_code = 0
    if hasattr(ctx.attr, "expected_exit_code"):
        expected_exit_code = ctx.attr.expected_exit_code

    # Add both the node executable for the user's local machine which is in ctx.files._node and comes
    # from @nodejs//:node_bin and the node executable from the selected node --platform which comes from
    # ctx.toolchains["@build_bazel_rules_nodejs//toolchains/node:toolchain_type"].nodeinfo.
    # In most cases these are the same files but for RBE and when explitely setting --platform for cross-compilation
    # any given nodejs_binary should be able to run on both the user's local machine and on the RBE or selected
    # platform.
    #
    # Rules such as nodejs_image should use only ctx.toolchains["@build_bazel_rules_nodejs//toolchains/node:toolchain_type"].nodeinfo
    # when building the image as that will reflect the selected --platform.
    node_tool_files = ctx.files._node[:]
    node_tool_files.extend(ctx.toolchains["@build_bazel_rules_nodejs//toolchains/node:toolchain_type"].nodeinfo.tool_files)

    node_tool_files.append(ctx.file._link_modules_script)
    node_tool_files.append(ctx.file._runfiles_helper_script)
    node_tool_files.append(ctx.file._node_patches_script)
    node_tool_files.append(ctx.file._lcov_merger_script)
    node_tool_files.append(node_modules_manifest)

    is_builtin = ctx.attr._node.label.workspace_name in ["nodejs_%s" % p for p in BUILT_IN_NODE_PLATFORMS]

    # First replace any instances of "$(rlocation " with "$$(rlocation " to preserve
    # legacy uses of "$(rlocation"
    expanded_args = [preserve_legacy_templated_args(a) for a in ctx.attr.templated_args]

    # First expand predefined source/output path variables:
    # $(execpath), $(rootpath) & legacy $(location)
    expanded_args = [expand_location_into_runfiles(ctx, a, ctx.attr.data) for a in expanded_args]

    # Next expand predefined variables & custom variables
    expanded_args = [ctx.expand_make_variables("templated_args", e, {}) for e in expanded_args]

    substitutions = {
        # TODO: Split up results of multifile expansions into separate args and qoute them with
        #       "TEMPLATED_args": " ".join(["\"%s\"" % a for a in expanded_args]),
        #       Need a smarter split operation than `expanded_arg.split(" ")` as it will split
        #       up args with intentional spaces and it will fail for expanded files with spaces.
        "TEMPLATED_args": " ".join(expanded_args),
        "TEMPLATED_env_vars": env_vars,
        "TEMPLATED_expected_exit_code": str(expected_exit_code),
        "TEMPLATED_lcov_merger_script": _to_manifest_path(ctx, ctx.file._lcov_merger_script),
        "TEMPLATED_link_modules_script": _to_manifest_path(ctx, ctx.file._link_modules_script),
        "TEMPLATED_loader_script": _to_manifest_path(ctx, ctx.outputs.loader_script),
        "TEMPLATED_modules_manifest": _to_manifest_path(ctx, node_modules_manifest),
        "TEMPLATED_node_patches_script": _to_manifest_path(ctx, ctx.file._node_patches_script),
        "TEMPLATED_repository_args": _to_manifest_path(ctx, ctx.file._repository_args),
        "TEMPLATED_require_patch_script": _to_manifest_path(ctx, ctx.outputs.require_patch_script),
        "TEMPLATED_runfiles_helper_script": _to_manifest_path(ctx, ctx.file._runfiles_helper_script),
        "TEMPLATED_vendored_node": "" if is_builtin else strip_external(ctx.file._node.path),
    }

    # TODO when we have "link_all_bins" we will only need to look in one place for the entry point
    #if ctx.file.entry_point.is_source:
    #    substitutions["TEMPLATED_script_path"] = "\"%s\"" % _to_execroot_path(ctx, ctx.file.entry_point)
    #else:
    #    substitutions["TEMPLATED_script_path"] = "$(rlocation \"%s\")" % _to_manifest_path(ctx, ctx.file.entry_point)
    # For now we need to look in both places
    substitutions["TEMPLATED_entry_point_execroot_path"] = "\"%s\"" % _to_execroot_path(ctx, ctx.file.entry_point)
    substitutions["TEMPLATED_entry_point_manifest_path"] = "$(rlocation \"%s\")" % _to_manifest_path(ctx, ctx.file.entry_point)

    ctx.actions.expand_template(
        template = ctx.file._launcher_template,
        output = ctx.outputs.launcher_sh,
        substitutions = substitutions,
        is_executable = True,
    )

    runfiles = []
    runfiles.extend(node_tool_files)
    runfiles.extend(ctx.files._bash_runfile_helper)
    runfiles.append(ctx.outputs.loader_script)
    runfiles.append(ctx.outputs.require_patch_script)
    runfiles.append(ctx.file._repository_args)

    if is_windows(ctx):
        runfiles.append(ctx.outputs.launcher_sh)
        executable = create_windows_native_launcher_script(ctx, ctx.outputs.launcher_sh)
    else:
        executable = ctx.outputs.launcher_sh

    # entry point is only needed in runfiles if it is a .js file
    if ctx.file.entry_point.extension == "js":
        runfiles.append(ctx.file.entry_point)

    return [
        DefaultInfo(
            executable = executable,
            runfiles = ctx.runfiles(
                transitive_files = depset(runfiles),
                files = node_tool_files + [
                            ctx.outputs.loader_script,
                            ctx.outputs.require_patch_script,
                        ] + ctx.files._source_map_support_files +

                        # We need this call to the list of Files.
                        # Calling the .to_list() method may have some perfs hits,
                        # so we should be running this method only once per rule.
                        # see: https://docs.bazel.build/versions/master/skylark/depsets.html#performance
                        node_modules.to_list() + sources.to_list(),
                collect_data = True,
            ),
        ),
        # TODO(alexeagle): remove sources and node_modules from the runfiles
        # when downstream usage is ready to rely on linker
        NodeRuntimeDepsInfo(
            deps = depset([ctx.file.entry_point], transitive = [node_modules, sources]),
            pkgs = ctx.attr.data,
        ),
        # indicates that the this binary should be instrumented by coverage
        # see https://docs.bazel.build/versions/master/skylark/lib/coverage_common.html
        # since this will be called from a nodejs_test, where the entrypoint is going to be the test file
        # we shouldn't add the entrypoint as a attribute to collect here
        coverage_common.instrumented_files_info(ctx, dependency_attributes = ["data"], extensions = ["js", "ts"]),
    ]

_NODEJS_EXECUTABLE_ATTRS = {
    "configuration_env_vars": attr.string_list(
        doc = """Pass these configuration environment variables to the resulting binary.
        Chooses a subset of the configuration environment variables (taken from `ctx.var`), which also
        includes anything specified via the --define flag.
        Note, this can lead to different outputs produced by this rule.""",
        default = [],
    ),
    "data": attr.label_list(
        doc = """Runtime dependencies which may be loaded during execution.""",
        allow_files = True,
        aspects = [node_modules_aspect, module_mappings_aspect, module_mappings_runtime_aspect],
    ),
    "default_env_vars": attr.string_list(
        doc = """Default environment variables that are added to `configuration_env_vars`.

This is separate from the default of `configuration_env_vars` so that a user can set `configuration_env_vars`
without losing the defaults that should be set in most cases.

The set of default  environment variables is:

- `VERBOSE_LOGS`: use by some rules & tools to turn on debug output in their logs
- `NODE_DEBUG`: used by node.js itself to print more logs
- `RUNFILES_LIB_DEBUG`: print diagnostic message from Bazel runfiles.bash helper
""",
        default = ["VERBOSE_LOGS", "NODE_DEBUG", "RUNFILES_LIB_DEBUG"],
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
        `--node_options=--preserve-symlinks`.

Subject to 'Make variable' substitution. See https://docs.bazel.build/versions/master/be/make-variables.html.

1. Subject to predefined source/output path variables substitutions.

The predefined variables `execpath`, `execpaths`, `rootpath`, `rootpaths`, `location`, and `locations` take
label parameters (e.g. `$(execpath //foo:bar)`) and substitute the file paths denoted by that label.

See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_label_variables for more info.

NB: This $(location) substition returns the manifest file path which differs from the *_binary & *_test
args and genrule bazel substitions. This will be fixed in a future major release.
See docs string of `expand_location_into_runfiles` macro in `internal/common/expand_into_runfiles.bzl`
for more info.

The recommended approach is to now use `$(rootpath)` where you previously used $(location).

To get from a `$(rootpath)` to the absolute path that `$$(rlocation $(location))` returned you can either use
`$$(rlocation $(rootpath))` if you are in the `templated_args` of a `nodejs_binary` or `nodejs_test`:

BUILD.bazel:
```
nodejs_test(
    name = "my_test",
    data = [":bootstrap.js"],
    templated_args = ["--node_options=--require=$$(rlocation $(rootpath :bootstrap.js))"],
)
```

or if you're in the context of a .js script you can pass the $(rootpath) as an argument to the script
and use the javascript runfiles helper to resolve to the absolute path:

BUILD.bazel:
```
nodejs_test(
    name = "my_test",
    data = [":some_file"],
    entry_point = ":my_test.js",
    templated_args = ["$(rootpath :some_file)"],
)
```

my_test.js
```
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const args = process.argv.slice(2);
const some_file = runfiles.resolveWorkspaceRelative(args[0]);
```

NB: Bazel will error if it sees the single dollar sign $(rlocation path) in `templated_args` as it will try to
expand `$(rlocation)` since we now expand predefined & custom "make" variables such as `$(COMPILATION_MODE)`,
`$(BINDIR)` & `$(TARGET_CPU)` using `ctx.expand_make_variables`. See https://docs.bazel.build/versions/master/be/make-variables.html.

To prevent expansion of `$(rlocation)` write it as `$$(rlocation)`. Bazel understands `$$` to be
the string literal `$` and the expansion results in `$(rlocation)` being passed as an arg instead
of being expanded. `$(rlocation)` is then evaluated by the bash node launcher script and it calls
the `rlocation` function in the runfiles.bash helper. For example, the templated arg
`$$(rlocation $(rootpath //:some_file))` is expanded by Bazel to `$(rlocation ./some_file)` which
is then converted in bash to the absolute path of `//:some_file` in runfiles by the runfiles.bash helper
before being passed as an argument to the program.

NB: nodejs_binary and nodejs_test will preserve the legacy behavior of `$(rlocation)` so users don't
need to update to `$$(rlocation)`. This may be changed in the future.

2. Subject to predefined variables & custom variable substitutions.

Predefined "Make" variables such as $(COMPILATION_MODE) and $(TARGET_CPU) are expanded.
See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_variables.

Custom variables are also expanded including variables set through the Bazel CLI with --define=SOME_VAR=SOME_VALUE.
See https://docs.bazel.build/versions/master/be/make-variables.html#custom_variables.

Predefined genrule variables are not supported in this context.
""",
    ),
    "_bash_runfile_helper": attr.label(default = Label("@build_bazel_rules_nodejs//third_party/github.com/bazelbuild/bazel/tools/bash/runfiles")),
    "_launcher_template": attr.label(
        default = Label("//internal/node:launcher.sh"),
        allow_single_file = True,
    ),
    "_lcov_merger_script": attr.label(
        default = Label("//internal/coverage:lcov_merger-js.js"),
        allow_single_file = True,
    ),
    "_link_modules_script": attr.label(
        default = Label("//internal/linker:index.js"),
        allow_single_file = True,
    ),
    "_loader_template": attr.label(
        default = Label("//internal/node:loader.js"),
        allow_single_file = True,
    ),
    "_node": attr.label(
        default = Label("@nodejs//:node_bin"),
        allow_single_file = True,
    ),
    "_node_patches_script": attr.label(
        default = Label("//internal/node:node_patches.js"),
        allow_single_file = True,
    ),
    "_repository_args": attr.label(
        default = Label("@nodejs//:bin/node_repo_args.sh"),
        allow_single_file = True,
    ),
    "_require_patch_template": attr.label(
        default = Label("//internal/node:require_patch.js"),
        allow_single_file = True,
    ),
    "_runfiles_helper_script": attr.label(
        default = Label("//internal/linker:runfiles_helper.js"),
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
    "launcher_sh": "%{name}.sh",
    "loader_script": "%{name}_loader.js",
    "require_patch_script": "%{name}_require_patch.js",
}

# The name of the declared rule appears in
# bazel query --output=label_kind
# So we make these match what the user types in their BUILD file
# and duplicate the definitions to give two distinct symbols.
nodejs_binary = rule(
    implementation = _nodejs_binary_impl,
    attrs = _NODEJS_EXECUTABLE_ATTRS,
    doc = "Runs some JavaScript code in NodeJS.",
    executable = True,
    outputs = _NODEJS_EXECUTABLE_OUTPUTS,
    toolchains = [
        "@build_bazel_rules_nodejs//toolchains/node:toolchain_type",
        "@bazel_tools//tools/sh:toolchain_type",
    ],
)

nodejs_test = rule(
    implementation = _nodejs_binary_impl,
    attrs = dict(_NODEJS_EXECUTABLE_ATTRS, **{
        "expected_exit_code": attr.int(
            doc = "The expected exit code for the test. Defaults to 0.",
            default = 0,
        ),
        # See the content of lcov_merger_sh for the reason we need this
        "_lcov_merger": attr.label(
            executable = True,
            default = Label("@build_bazel_rules_nodejs//internal/coverage:lcov_merger_sh"),
            cfg = "target",
        ),
    }),
    doc = """
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
""",
    test = True,
    outputs = _NODEJS_EXECUTABLE_OUTPUTS,
    toolchains = [
        "@build_bazel_rules_nodejs//toolchains/node:toolchain_type",
        "@bazel_tools//tools/sh:toolchain_type",
    ],
)

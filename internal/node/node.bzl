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

load("//:providers.bzl", "DirectoryFilePathInfo", "ExternalNpmPackageInfo", "JSModuleInfo", "JSNamedModuleInfo", "NodeRuntimeDepsInfo", "node_modules_aspect")
load("//internal/common:expand_into_runfiles.bzl", "expand_location_into_runfiles")
load("//internal/common:module_mappings.bzl", "module_mappings_runtime_aspect")
load("//internal/common:path_utils.bzl", "strip_external")
load("//internal/common:preserve_legacy_templated_args.bzl", "preserve_legacy_templated_args")
load("//internal/common:windows_utils.bzl", "create_windows_native_launcher_script", "is_windows")
load("//internal/linker:link_node_modules.bzl", "MODULE_MAPPINGS_ASPECT_RESULTS_NAME", "module_mappings_aspect", "write_node_modules_manifest")
load("//internal/node:node_repositories.bzl", "BUILT_IN_NODE_PLATFORMS")

def _trim_package_node_modules(package_name):
    # trim a package name down to its path prior to a node_modules
    # segment. 'foo/node_modules/bar' would become 'foo' and
    # 'node_modules/bar' would become ''
    segments = []
    for n in package_name.split("/"):
        if n == "node_modules":
            break
        segments.append(n)
    return "/".join(segments)

def _compute_node_modules_roots(ctx, data):
    """Computes the node_modules root (if any) from data attribute."""
    node_modules_roots = {}

    # Add in roots from third-party deps
    for d in data:
        if ExternalNpmPackageInfo in d:
            path = d[ExternalNpmPackageInfo].path
            workspace = d[ExternalNpmPackageInfo].workspace
            if path in node_modules_roots:
                other_workspace = node_modules_roots[path]
                if other_workspace != workspace:
                    fail("All npm dependencies at the path '%s' must come from a single workspace. Found '%s' and '%s'." % (path, other_workspace, workspace))
            node_modules_roots[path] = workspace

    # Add in roots for multi-linked first party deps
    for dep in data:
        for k, v in getattr(dep, MODULE_MAPPINGS_ASPECT_RESULTS_NAME, {}).items():
            map_key_split = k.split(":")
            package_name = map_key_split[0]
            package_path = map_key_split[1] if len(map_key_split) > 1 else ""
            if package_path not in node_modules_roots:
                node_modules_roots[package_path] = ""
    return node_modules_roots

def _write_require_patch_script(ctx, data, node_modules_root):
    # Generates the JavaScript snippet of module roots mappings, with each entry
    # in the form:
    #   {module_name: /^mod_name\b/, module_root: 'path/to/mod_name'}
    module_mappings = []
    for d in data:
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

def _ts_to_js(entry_point_path):
    """If the entry point specified is a typescript file then set it to .js.

    Workaround for #1974
    ts_library doesn't give labels for its .js outputs so users are forced to give .ts labels

    Args:
        entry_point_path: a file path
    """
    if entry_point_path.endswith(".ts"):
        return entry_point_path[:-3] + ".js"
    elif entry_point_path.endswith(".tsx"):
        return entry_point_path[:-4] + ".js"
    return entry_point_path

def _get_entry_point_file(ctx):
    if len(ctx.attr.entry_point.files.to_list()) > 1:
        fail("labels in entry_point must contain exactly one file")
    if len(ctx.files.entry_point) == 1:
        return ctx.files.entry_point[0]
    if DirectoryFilePathInfo in ctx.attr.entry_point:
        return ctx.attr.entry_point[DirectoryFilePathInfo].directory
    fail("entry_point must either be a file, or provide DirectoryFilePathInfo")

def _write_loader_script(ctx):
    entry_point_path = _ts_to_js(_to_manifest_path(ctx, _get_entry_point_file(ctx)))

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

def _join(*elements):
    return "/".join([f for f in elements if f])

def _nodejs_binary_impl(ctx, data = [], runfiles = [], expanded_args = []):
    node_modules_manifest = write_node_modules_manifest(ctx, link_workspace_root = ctx.attr.link_workspace_root)
    node_modules_depsets = []
    data = ctx.attr.data + data

    # Also include files from npm fine grained deps as inputs.
    # These deps are identified by the ExternalNpmPackageInfo provider.
    for d in data:
        if ExternalNpmPackageInfo in d:
            node_modules_depsets.append(d[ExternalNpmPackageInfo].sources)

    node_modules = depset(transitive = node_modules_depsets)

    # Using an array of depsets will allow us to avoid flattening files and sources
    # inside this loop. This should reduce the performances hits,
    # since we don't need to call .to_list()
    # Also avoid deap transitive depset()s by creating single array of
    # transitive depset()s
    sources_depsets = []

    for d in data:
        if JSModuleInfo in d:
            sources_depsets.append(d[JSModuleInfo].sources)

        # Deprecated should be removed with version 3.x.x at least have a transition phase
        # for dependencies to provide the output under the JSModuleInfo instead.
        if JSNamedModuleInfo in d:
            sources_depsets.append(d[JSNamedModuleInfo].sources)
        if hasattr(d, "files"):
            sources_depsets.append(d.files)
    sources = depset(transitive = sources_depsets)

    node_modules_roots = _compute_node_modules_roots(ctx, data)

    if "" in node_modules_roots:
        node_modules_root = node_modules_roots[""] + "/node_modules"
    else:
        # there are no fine grained deps but we still need a node_modules_root even if it is a non-existant one
        node_modules_root = "build_bazel_rules_nodejs/node_modules"
    _write_require_patch_script(ctx, data, node_modules_root)

    _write_loader_script(ctx)

    # Provide the target name as an environment variable avaiable to all actions for the
    # runfiles helpers to use.
    env_vars = "export BAZEL_TARGET=%s\n" % ctx.label

    # Add all env vars from the ctx attr
    for [key, value] in ctx.attr.env.items():
        env_vars += "export %s=%s\n" % (key, expand_location_into_runfiles(ctx, value, data))

    # While we can derive the workspace from the pwd when running locally
    # because it is in the execroot path `execroot/my_wksp`, on RBE the
    # `execroot/my_wksp` path is reduced a path such as `/w/f/b` so
    # the workspace name is obfuscated from the path. So we provide the workspace
    # name here as an environment variable avaiable to all actions for the
    # runfiles helpers to use.
    env_vars += "export BAZEL_WORKSPACE=%s\n" % ctx.workspace_name

    bazel_node_module_roots = ""
    for path, root in node_modules_roots.items():
        if bazel_node_module_roots:
            bazel_node_module_roots = bazel_node_module_roots + ","
        bazel_node_module_roots = bazel_node_module_roots + "%s:%s" % (path, root)

    # if BAZEL_NODE_MODULES_ROOTS has not already been set by
    # run_node, then set it to the computed value
    env_vars += """if [[ -z "${BAZEL_NODE_MODULES_ROOTS:-}" ]]; then
  export BAZEL_NODE_MODULES_ROOTS=%s
fi
""" % bazel_node_module_roots

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
    node_tool_files.append(ctx.file._runfile_helpers_bundle)
    node_tool_files.append(ctx.file._runfile_helpers_main)
    node_tool_files.append(ctx.file._node_patches_script)
    node_tool_files.append(ctx.file._lcov_merger_script)
    node_tool_files.append(node_modules_manifest)

    is_builtin = ctx.attr._node.label.workspace_name in ["nodejs_%s" % p for p in BUILT_IN_NODE_PLATFORMS]

    runfiles = runfiles[:]
    runfiles.extend(node_tool_files)
    runfiles.extend(ctx.files._bash_runfile_helper)
    runfiles.append(ctx.outputs.loader_script)
    runfiles.append(ctx.outputs.require_patch_script)
    runfiles.append(ctx.file._repository_args)

    # First replace any instances of "$(rlocation " with "$$(rlocation " to preserve
    # legacy uses of "$(rlocation"
    expanded_args = expanded_args + [preserve_legacy_templated_args(a) for a in ctx.attr.templated_args]

    # chdir has to include rlocation lookup for windows
    # that means we have to generate a script so there's an entry in the runfiles manifest
    if ctx.attr.chdir:
        # limitation of ctx.actions.declare_file - you have to chdir within the package
        if ctx.attr.chdir == ctx.label.package:
            relative_dir = None
        elif ctx.attr.chdir.startswith(ctx.label.package + "/"):
            relative_dir = ctx.attr.chdir[len(ctx.label.package) + 1:]
        else:
            fail("""nodejs_binary/nodejs_test only support chdir inside the current package
                    but %s is not a subfolder of %s""" % (ctx.attr.chdir, ctx.label.package))
        chdir_script = ctx.actions.declare_file(_join(relative_dir, "__chdir.js__"))
        ctx.actions.write(chdir_script, "process.chdir(__dirname)")
        runfiles.append(chdir_script)

        # this join is effectively a $(rootdir) expansion
        expanded_args.append("--node_options=--require=$$(rlocation %s)" % _join(ctx.workspace_name, chdir_script.short_path))

    # Next expand predefined source/output path variables:
    # $(execpath), $(rootpath) & legacy $(location)
    expanded_args = [expand_location_into_runfiles(ctx, a, data) for a in expanded_args]

    # Finally expand predefined variables & custom variables
    rule_dir = _join(ctx.bin_dir.path, ctx.label.workspace_root, ctx.label.package)
    additional_substitutions = {
        "@D": rule_dir,
        "RULEDIR": rule_dir,
    }
    expanded_args = [ctx.expand_make_variables("templated_args", e, additional_substitutions) for e in expanded_args]

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
        "TEMPLATED_runfiles_helper_script": _to_manifest_path(ctx, ctx.file._runfile_helpers_main),
        "TEMPLATED_vendored_node": "" if is_builtin else strip_external(ctx.file._node.path),
    }

    # TODO when we have "link_all_bins" we will only need to look in one place for the entry point
    #if ctx.file.entry_point.is_source:
    #    substitutions["TEMPLATED_script_path"] = "\"%s\"" % _to_execroot_path(ctx, ctx.file.entry_point)
    #else:
    #    substitutions["TEMPLATED_script_path"] = "$(rlocation \"%s\")" % _to_manifest_path(ctx, ctx.file.entry_point)
    # For now we need to look in both places
    substitutions["TEMPLATED_entry_point_execroot_path"] = "\"%s\"" % _ts_to_js(_to_execroot_path(ctx, _get_entry_point_file(ctx)))
    substitutions["TEMPLATED_entry_point_manifest_path"] = "$(rlocation \"%s\")" % _ts_to_js(_to_manifest_path(ctx, _get_entry_point_file(ctx)))
    if DirectoryFilePathInfo in ctx.attr.entry_point:
        substitutions["TEMPLATED_entry_point_main"] = ctx.attr.entry_point[DirectoryFilePathInfo].path
    else:
        substitutions["TEMPLATED_entry_point_main"] = ""

    ctx.actions.expand_template(
        template = ctx.file._launcher_template,
        output = ctx.outputs.launcher_sh,
        substitutions = substitutions,
        is_executable = True,
    )

    if is_windows(ctx):
        runfiles.append(ctx.outputs.launcher_sh)
        executable = create_windows_native_launcher_script(ctx, ctx.outputs.launcher_sh)
    else:
        executable = ctx.outputs.launcher_sh

    # syntax sugar: allows you to avoid repeating the entry point in data
    # entry point is only needed in runfiles if it is a .js file
    if len(ctx.files.entry_point) == 1 and ctx.files.entry_point[0].extension == "js":
        runfiles.extend(ctx.files.entry_point)

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
            deps = depset(ctx.files.entry_point, transitive = [node_modules, sources]),
            pkgs = data,
        ),
        # indicates that the this binary should be instrumented by coverage
        # see https://docs.bazel.build/versions/master/skylark/lib/coverage_common.html
        # since this will be called from a nodejs_test, where the entrypoint is going to be the test file
        # we shouldn't add the entrypoint as a attribute to collect here
        coverage_common.instrumented_files_info(ctx, dependency_attributes = ["data"], extensions = ["js", "ts"]),
    ]

_NODEJS_EXECUTABLE_ATTRS = {
    "chdir": attr.string(
        doc = """Working directory to run the binary or test in, relative to the workspace.
By default, Bazel always runs in the workspace root.
Due to implementation details, this argument must be underneath this package directory.

To run in the directory containing the `nodejs_binary` / `nodejs_test`, use

    chdir = package_name()

(or if you're in a macro, use `native.package_name()`)

WARNING: this will affect other paths passed to the program, either as arguments or in configuration files,
which are workspace-relative.
You may need `../../` segments to re-relativize such paths to the new working directory.
""",
    ),
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

```python
nodejs_binary(
    name = "my_binary",
    ...
    entry_point = ":file.js",
)
```

You can specify the entry point as a typescript file so long as you also include
the ts_library target in data:

```python
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

```python
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

```python
nodejs_binary(
    name = "history-server",
    entry_point = "@npm//:node_modules/history-server/modules/cli.js",
    data = ["@npm//history-server"],
)
```
""",
        mandatory = True,
        allow_files = True,
    ),
    "env": attr.string_dict(
        doc = """Specifies additional environment variables to set when the target is executed, subject to location
expansion.
        """,
        default = {},
    ),
    "link_workspace_root": attr.bool(
        doc = """Link the workspace root to the bin_dir to support absolute requires like 'my_wksp/path/to/file'.
If source files need to be required then they can be copied to the bin_dir with copy_to_bin.""",
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
```python
nodejs_test(
    name = "my_test",
    data = [":bootstrap.js"],
    templated_args = ["--node_options=--require=$$(rlocation $(rootpath :bootstrap.js))"],
)
```

or if you're in the context of a .js script you can pass the $(rootpath) as an argument to the script
and use the javascript runfiles helper to resolve to the absolute path:

BUILD.bazel:
```python
nodejs_test(
    name = "my_test",
    data = [":some_file"],
    entry_point = ":my_test.js",
    templated_args = ["$(rootpath :some_file)"],
)
```

my_test.js
```python
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
    "_runfile_helpers_bundle": attr.label(
        default = Label("//internal/runfiles:index.js"),
        allow_single_file = True,
    ),
    "_runfile_helpers_main": attr.label(
        default = Label("//internal/runfiles:runfile_helper_main.js"),
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

nodejs_binary_kwargs = {
    "attrs": _NODEJS_EXECUTABLE_ATTRS,
    "doc": "Runs some JavaScript code in NodeJS.",
    "executable": True,
    "implementation": _nodejs_binary_impl,
    "outputs": _NODEJS_EXECUTABLE_OUTPUTS,
    "toolchains": [
        "@build_bazel_rules_nodejs//toolchains/node:toolchain_type",
        "@bazel_tools//tools/sh:toolchain_type",
    ],
}

nodejs_test_kwargs = dict(
    nodejs_binary_kwargs,
    attrs = dict(nodejs_binary_kwargs["attrs"], **{
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

If you just want to run a standard test using a test runner from npm, use the generated
*_test target created by npm_install/yarn_install, such as `mocha_test`.
Some test runners like Karma and Jasmine have custom rules with added features, e.g. `jasmine_node_test`.

By default, Bazel runs tests with a working directory set to your workspace root.
Use the `chdir` attribute to change the working directory before the program starts.

To debug a Node.js test, we recommend saving a group of flags together in a "config".
Put this in your `tools/bazel.rc` so it's shared with your team:
```python
# Enable debugging tests with --config=debug
test:debug --test_arg=--node_options=--inspect-brk --test_output=streamed --test_strategy=exclusive --test_timeout=9999 --nocache_test_results
```

Now you can add `--config=debug` to any `bazel test` command line.
The runtime will pause before executing the program, allowing you to connect a
remote debugger.
""",
    test = True,
)

# The name of the declared rule appears in
# bazel query --output=label_kind
# So we make these match what the user types in their BUILD file
# and duplicate the definitions to give two distinct symbols.
nodejs_binary = rule(**nodejs_binary_kwargs)

nodejs_test = rule(**nodejs_test_kwargs)

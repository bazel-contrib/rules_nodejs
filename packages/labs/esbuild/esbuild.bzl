# Copyright 2021 The Bazel Authors. All rights reserved.
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
"esbuild"

load("@build_bazel_rules_nodejs//:providers.bzl", "JSEcmaScriptModuleInfo", "JSModuleInfo", "NpmPackageInfo", "node_modules_aspect", "run_node")
load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect")
load("@build_bazel_rules_nodejs//packages/typescript/internal:ts_config.bzl", "TsConfigInfo")

def _is_supported(f):
    return f.extension == "js" or f.extension == "mjs" or f.extension == "css"

def _strip_ext(f):
    return f.short_path[:-len(f.extension) - 1]

def _resolve_input(f, inputs):
    if _is_supported(f):
        return f

    no_ext = _strip_ext(f)
    for i in inputs:
        if _is_supported(i):
            if _strip_ext(i) == no_ext:
                return i
    fail("Could not find corresponding javascript entry point for %s. Add the %s.js to your deps." % (f.path, no_ext))

def _filter_supported_files(files):
    return [f for f in files if _is_supported(f)]

def _resolve_entry_points(file, files, inputs):
    if file != None:
        files = [file]

    return [_resolve_input(f, inputs) for f in files]

def _es_build_impl(ctx):
    # For each dep, JSEcmaScriptModuleInfo is used if found, then JSModuleInfo and finally
    # the DefaultInfo files are used if the former providers are not found.
    deps_depsets = []
    for dep in ctx.attr.deps:
        if JSEcmaScriptModuleInfo in dep:
            deps_depsets.append(dep[JSEcmaScriptModuleInfo].sources)
        elif JSModuleInfo in dep:
            deps_depsets.append(dep[JSModuleInfo].sources)
        elif hasattr(dep, "files"):
            deps_depsets.append(dep.files)

        if NpmPackageInfo in dep:
            deps_depsets.append(dep[NpmPackageInfo].sources)

    deps_inputs = depset(transitive = deps_depsets).to_list()
    inputs = _filter_supported_files(ctx.files.entry_point) + ctx.files.srcs + deps_inputs

    if ctx.file.tsconfig:
        inputs.append(ctx.file.tsconfig)
        if TsConfigInfo in ctx.attr.tsconfig:
            inputs.extend(ctx.attr.tsconfig[TsConfigInfo].deps)

    outputs = [getattr(ctx.outputs, o) for o in dir(ctx.outputs)]
    if ctx.attr.outdir:
        outputs.append(ctx.actions.declare_directory(ctx.label.name))

    entry_points = _resolve_entry_points(ctx.file.entry_point, ctx.files.entry_points, inputs)

    args = ctx.actions.args()
    args.add_all([f.path for f in entry_points])
    args.add("--bundle")
    if ctx.attr.minify:
        args.add("--minify")
    if ctx.attr.splitting:
        args.add("--splitting")
    if ctx.attr.format:
        args.add_joined(["--format", ctx.attr.format], join_with = "=")
    if ctx.attr.metafile:
        metafile = ctx.actions.declare_file("%s_esbuild_metafile.json" % ctx.attr.name)
        outputs.append(metafile)
        args.add_joined(["--metafile", metafile.path], join_with = "=")

    if ctx.attr.sourcemap != "default":
        args.add_joined(["--sourcemap", ctx.attr.sourcemap], join_with = "=")
    elif ctx.attr.sourcemap == "default":
        args.add("--sourcemap")

    if ctx.attr.outdir:
        args.add_joined(["--outdir", outputs[0].path], join_with = "=")
    else:
        args.add_joined(["--outfile", outputs[0].path], join_with = "=")

    args.add_joined(["--platform", ctx.attr.platform], join_with = "=")
    args.add_all(ctx.attr.loader, format_each = "--loader=%s")
    args.add_all(ctx.attr.define, format_each = "--define=%s")
    args.add_joined(["--target", "esnext"], join_with = "=")
    args.add_joined(["--log-level", "error"], join_with = "=")
    args.add_joined(["--tsconfig", ctx.file.tsconfig.path], join_with = "=")
    args.add_all(ctx.attr.external, format_each = "--external=%s")

    args.use_param_file("@%s", use_always = True)
    args.set_param_file_format("multiline")

    run_node(
        ctx,
        inputs = inputs,
        outputs = outputs,
        executable = "_esbuild_bin",
        arguments = [args],
        progress_message = "Bundling Javascript %s [esbuild]" % ",".join([f.short_path for f in entry_points]),
        mnemonic = "Esbuild",
        # execution_requirements = {"supports-workers": "1"},
    )

    return [
        DefaultInfo(files = depset(outputs)),
    ]

def _esbuild_outs(sourcemap, entry_point, outdir):
    """Supply some labelled outputs in the common case of a single entry point"""
    result = {}
    if outdir:
        # We can't declare a directory output here, because RBE will be confused, like
        # com.google.devtools.build.lib.remote.ExecutionStatusException:
        # INTERNAL: failed to upload outputs: failed to construct CAS files:
        # failed to calculate file hash:
        # read /b/f/w/bazel-out/k8-fastbuild/bin/packages/rollup/test/multiple_entry_points/chunks: is a directory
        #result["chunks"] = output_dir
        return {}
    else:
        out = entry_point
        result[out] = out + ".js"
        if sourcemap == "external":
            result[out + "_map"] = "%s.map" % result[out]
    return result

_esbuild_rule = rule(
    attrs = {
        "define": attr.string_list(
            doc = """A list of global identifier replacements.

Example:

```python
esbuild_bundle(
    name = "bundle",
    define = [
        "process.env.NODE_ENV=\\"production\\""
    ],
)
```

See https://esbuild.github.io/api/#define for more details.""",
            default = [],
        ),
        "deps": attr.label_list(
            aspects = [module_mappings_aspect, node_modules_aspect],
        ),
        "entry_point": attr.label(
            doc = "A single entry point from which the begin the bundle.",
            allow_single_file = True,
        ),
        "entry_points": attr.label_list(
            doc = """A list of entry points.

Each entry point will create its own bundle.""",
            allow_files = True,
        ),
        "external": attr.string_list(
            doc = """The list of packages or files considered to be external to the build.

See https://esbuild.github.io/api/#external for more details.""",
            default = [],
        ),
        "format": attr.string(
            doc = """The bundle's output format.
One of "iife", "cjs", or "esm".

See https://esbuild.github.io/api/#format for more details.""",
        ),
        "loader": attr.string_list(
            doc = """A list of loaders to use for bundling.

Example:

```python
esbuild_bundle(
    name = "bundle",
    loader = [
        ".png=dataurl"
    ],
)
```

See https://esbuild.github.io/api/#loader for more details.""",
            default = [],
        ),
        "metafile": attr.bool(
            doc = """Whether or not to output a metafile.

This will create a metafile with the name `${name}_esbuild_metafile.json` in
this build target's output directory.

See https://esbuild.github.io/api/#metafile for more details.""",
        ),
        "minify": attr.bool(
            doc = "Whether or not to minify the output.",
        ),
        "outdir": attr.bool(
            doc = """Whether or not to place output files in a separate directory.

This will use the build target's name as the directory name.

See https://esbuild.github.io/api/#outdir for more details.""",
        ),
        "platform": attr.string(
            doc = """The target platform.

See https://esbuild.github.io/api/#platform for more details.""",
            default = "browser",
        ),
        "sourcemap": attr.string(
            doc = """The method for generating sourcemaps.

See https://esbuild.github.io/api/#sourcemap for more details.

If you wish to use the default sourcemap behaviour, pass in "default".""",
            default = "default",
        ),
        "splitting": attr.bool(
            doc = """Whether or not to perform code splitting.

See https://esbuild.github.io/api/#splitting for more details.""",
        ),
        "srcs": attr.label_list(
            doc = "Additional files to include in the bundle",
            allow_files = True,
            default = [],
        ),
        "tsconfig": attr.label(
            doc = """The tsconfig file to use for the build.

See https://esbuild.github.io/api/#tsconfig for more details.""",
            default = "//:tsconfig.json",
            allow_single_file = True,
        ),
        "_esbuild_bin": attr.label(
            default = ":esbuild_wrapper",
            executable = True,
            cfg = "host",
        ),
    },
    implementation = _es_build_impl,
    outputs = _esbuild_outs,
    doc = """Wraps https://esbuild.github.io/ for use in Bazel.

Example:

```python
esbuild_bundle(
    name = "bundle",
    define = [
        "process.env.NODE_ENV=\\"development\\"",
    ],
    entry_points = [
        "main.ts",
    ],
    external = [
        "firebase-admin",
    ],
    format = "esm",
    minify = True,
    outdir = True,
    sourcemap = "external",
    tsconfig = ":tsconfig.json",
    deps = [
        ":app_lib",
    ],
)
```
""",
)

def esbuild_bundle(entry_point = None, entry_points = None, outfile = None, outdir = None, **kwargs):
    """Wraps https://esbuild.github.io/ for use in Bazel.

Example:

```python
esbuild_bundle(
    name = "bundle",
    define = [
        "process.env.NODE_ENV=\\"development\\"",
    ],
    entry_points = [
        "main.ts",
    ],
    external = [
        "firebase-admin",
    ],
    format = "esm",
    minify = True,
    outdir = True,
    sourcemap = "external",
    tsconfig = ":tsconfig.json",
    deps = [
        ":app_lib",
    ],
)
```
    """
    if entry_point != None and entry_points != None:
        fail("Only one of `entry_point` and `entry_points` can be specified")

    if entry_point == None and entry_points == None:
        fail("One of `entry_point` or `entry_points` must be specified")

    if entry_points != None and outdir == None:
        fail("`outdir` must be specified")

    _esbuild_rule(
        entry_point = entry_point,
        entry_points = entry_points,
        outdir = outdir,
        **kwargs
    )

"Rules for running Rollup under Bazel"

load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect", "register_node_modules_linker")

_ROLLUP_ATTRS = {
    "srcs": attr.label_list(
        doc = """JavaScript source files from the workspace.

The file passed to entry_point is automatically added.
""",
        allow_files = [".js", ".json"],
    ),
    "config_file": attr.label(
        doc = """A rollup.config.js file

Passed to the --config 
See https://rollupjs.org/guide/en/#configuration-files

If not set, a default basic Rollup config is used.
""",
        allow_single_file = True,
        default = "@npm_bazel_rollup//:rollup.config.js",
    ),
    "entry_point": attr.label(
        doc = """The bundle's entry point(s) (e.g. your main.js or app.js or index.js).

Passed to the [`--input` option](https://github.com/rollup/rollup/blob/master/docs/999-big-list-of-options.md#input) in Rollup.        
If you provide an array of entry points or an object mapping names to entry points, they will be bundled to separate output chunks.
""",
        mandatory = True,
        allow_single_file = True,
    ),
    "format": attr.string(
        doc = """"Specifies the format of the generated bundle. One of the following:

- `amd`: Asynchronous Module Definition, used with module loaders like RequireJS
- `cjs`: CommonJS, suitable for Node and other bundlers
- `esm`: Keep the bundle as an ES module file, suitable for other bundlers and inclusion as a `<script type=module>` tag in modern browsers
- `iife`: A self-executing function, suitable for inclusion as a `<script>` tag. (If you want to create a bundle for your application, you probably want to use this.)
- `umd`: Universal Module Definition, works as amd, cjs and iife all in one
- `system`: Native format of the SystemJS loader
""",
        values = ["amd", "cjs", "esm", "iife", "umd", "system"],
        default = "esm",
    ),
    "globals": attr.string_dict(
        doc = """Specifies id: variableName pairs necessary for external imports in umd/iife bundles.

Passed to the [`--globals` option](https://github.com/rollup/rollup/blob/master/docs/999-big-list-of-options.md#outputglobals) in Rollup.
Also, the keys from the map are passed to the [`--external` option](https://github.com/rollup/rollup/blob/master/docs/999-big-list-of-options.md#external).
""",
    ),
    "output_dir": attr.string(
        doc = """The directory in which all generated chunks are placed.

By default, the directory is named the same as the target name.
""",
    ),
    "rollup_bin": attr.label(
        doc = "Target that executes the rollup binary",
        executable = True,
        cfg = "host",
        default = "@npm//rollup/bin:rollup",
    ),
    "sourcemap": attr.bool(
        doc = """Whether to produce a .js.map output

Passed to the [`--sourcemap` option](https://github.com/rollup/rollup/blob/master/docs/999-big-list-of-options.md#outputsourcemap") in Rollup
""",
        default = True,
    ),
    "deps": attr.label_list(
        aspects = [module_mappings_aspect],
        doc = """Other libraries that are required by the code, or by the rollup.config.js""",
    ),
}

def _chunks_dir_out(output_dir, name):
    return output_dir if output_dir else name

def _rollup_outs(sourcemap, name, entry_point, output_dir):
    # TODO: is it okay that entry_point.name includes extension?
    # what if the label was blah.ts?
    result = {"entry_point_chunk": "/".join([_chunks_dir_out(output_dir, name), entry_point.name])}
    if sourcemap:
        result["sourcemap"] = "%s.map" % result["entry_point_chunk"]
    return result

def _no_ext(f):
    return f.short_path[:-len(f.extension) - 1]

def _rollup_bundle(ctx):
    "Generate a rollup config file and run rollup"

    inputs = [ctx.file.entry_point] + ctx.files.srcs + ctx.files.deps
    outputs = [ctx.outputs.entry_point_chunk]

    # See CLI documentation at https://rollupjs.org/guide/en/#command-line-reference
    args = ctx.actions.args()

    args.add_all(["--input", _no_ext(ctx.file.entry_point)])
    args.add_all(["--format", ctx.attr.format])

    # Assume we always want to generate chunked output, so supply output.dir rather than output.file
    out_dir = ctx.actions.declare_directory(_chunks_dir_out(ctx.attr.output_dir, ctx.label.name))
    outputs.append(out_dir)
    args.add_all(["--output.dir", out_dir.path])

    register_node_modules_linker(ctx, args, inputs)

    config = ctx.actions.declare_file("_%s.rollup_config.js" % ctx.label.name)
    ctx.actions.expand_template(
        template = ctx.file.config_file,
        output = config,
        substitutions = {
            "bazel_stamp_file": "\"%s\"" % ctx.version_file.path if ctx.version_file else "undefined",
        },
    )
    args.add_all(["--config", config.path])
    inputs.append(config)

    if ctx.version_file:
        inputs.append(ctx.version_file)

    # Prevent rollup's module resolver from hopping outside Bazel's sandbox
    # When set to false, symbolic links are followed when resolving a file.
    # When set to true, instead of being followed, symbolic links are treated as if the file is
    # where the link is.
    args.add("--preserveSymlinks")

    if (ctx.attr.sourcemap):
        args.add("--sourcemap")
        outputs.append(ctx.outputs.sourcemap)

    if ctx.attr.globals:
        args.add("--external")
        args.add_joined(ctx.attr.globals.keys(), join_with = ",")
        args.add("--globals")
        args.add_joined(["%s:%s" % g for g in ctx.attr.globals.items()], join_with = ",")

    ctx.actions.run(
        progress_message = "Bundling JavaScript %s [rollup]" % ctx.outputs.entry_point_chunk.short_path,
        executable = ctx.executable.rollup_bin,
        inputs = inputs,
        outputs = outputs,
        arguments = [args],
    )

rollup_bundle = rule(
    doc = """Runs the Rollup.js CLI under Bazel.

See https://rollupjs.org/guide/en/#command-line-reference

Typical example:
```python
load("@npm_bazel_rollup//:index.bzl", "rollup_bundle")

rollup_bundle(
    name = "bundle",
    srcs = ["dependency.js"],
    entry_point = "input.js",
    config_file = "rollup.config.js",
)
```

Note that the command-line options set by Bazel override what appears in the rollup config file.
This means that typically a single `rollup.config.js` can contain settings for your whole repo,
and multiple `rollup_bundle` rules can share the configuration.

Thus, setting options that Bazel controls will have no effect, e.g.

```javascript
module.exports = {
    output: { file: 'this_is_ignored.js' },
}
```
""",
    implementation = _rollup_bundle,
    attrs = _ROLLUP_ATTRS,
    outputs = _rollup_outs,
)

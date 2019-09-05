"Rules for running Rollup under Bazel"

load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect", "register_node_modules_linker")

_DOC = """Runs the Rollup.js CLI under Bazel.

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

The rollup_bundle rule always produces a directory output, because it isn't known until
rollup runs whether the output has many chunks or is a single file.

To get multiple output formats, wrap the rule with a macro or list comprehension, e.g.

```python
[
    rollup_bundle(
        name = "bundle.%s" % format,
        entry_point = "foo.js",
        format = format,
    )
    for format in [
        "cjs",
        "umd",
    ]
]
```

This will produce one output directory per requested format.
"""

_ROLLUP_ATTRS = {
    "srcs": attr.label_list(
        doc = """Non-entry point JavaScript source files from the workspace.

You must not repeat file(s) passed to entry_point/entry_points.
""",
        # Don't try to constrain the filenames, could be json, svg, whatever
        allow_files = True,
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
        doc = """The bundle's entry point (e.g. your main.js or app.js or index.js).

This is just a shortcut for the `entry_points` attribute with a single output chunk named the same as the entry_point attribute.

For example, these are equivalent:

```python
rollup_bundle(
    name = "bundle",
    entry_point = "index.js",
)
```

```python
rollup_bundle(
    name = "bundle",
    entry_points = {
        "index.js": "index"
    }
)
```

If the entry_point attribute is instead a label that produces a single .js file,
this will work, but the resulting output will be named after the label,
so these are equivalent:

```python
# Outputs index.js
produces_js(
    name = "producer",
)
rollup_bundle(
    name = "bundle",
    entry_point = "producer",
)
```

```python
rollup_bundle(
    name = "bundle",
    entry_points = {
        "index.js": "producer"
    }
)
```
""",
        allow_single_file = [".js"],
    ),
    "entry_points": attr.label_keyed_string_dict(
        doc = """The bundle's entry points (e.g. your main.js or app.js or index.js).

Passed to the [`--input` option](https://github.com/rollup/rollup/blob/master/docs/999-big-list-of-options.md#input) in Rollup.

Keys in this dictionary are labels pointing to .js entry point files.
Values are the name to be given to the corresponding output chunk.

Either this attribute or `entry_point` must be specified, but not both.
""",
        allow_files = [".js"],
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

def _desugar_entry_point_names(entry_point, entry_points):
    """Users can specify entry_point (sugar) or entry_points (long form).

    This function allows our code to treat it like they always used the long form.

    It also performs validation:
    - exactly one of these attributes should be specified
    """
    if entry_point and entry_points:
        fail("Cannot specify both entry_point and entry_points")
    if not entry_point and not entry_points:
        fail("One of entry_point or entry_points must be specified")
    if entry_point:
        name = entry_point.name
        if name.endswith(".js"):
            name = name[:-3]
        if name.endswith(".mjs"):
            name = name[:-4]
        return [name]
    return entry_points.values()

def _desugar_entry_points(entry_point, entry_points):
    """Like above, but used by the implementation function, where the types differ.

    It also performs validation:
    - attr.label_keyed_string_dict doesn't accept allow_single_file
      so we have to do validation now to be sure each key is a label resulting in one file

    It converts from dict[target: string] to dict[file: string]
    """
    names = _desugar_entry_point_names(entry_point.label if entry_point else None, entry_points)

    if entry_point:
        return {entry_point.files.to_list()[0]: names[0]}

    result = {}
    for ep in entry_points.items():
        entry_point = ep[0]
        name = ep[1]
        f = entry_point.files.to_list()
        if len(f) != 1:
            fail("keys in rollup_bundle#entry_points must provide one file, but %s has %s" % (entry_point.label, len(f)))
        result[f[0]] = name
    return result

def _rollup_outs(sourcemap, name, entry_point, entry_points, output_dir):
    """Supply some labelled outputs in the common case of a single entry point"""
    result = {}
    for out in _desugar_entry_point_names(entry_point, entry_points):
        result[out] = "/".join([_chunks_dir_out(output_dir, name), out + ".js"])
        if sourcemap:
            result[out + "_map"] = "%s.map" % result[out]
    return result

def _no_ext(f):
    return f.short_path[:-len(f.extension) - 1]

def _rollup_bundle(ctx):
    "Generate a rollup config file and run rollup"

    inputs = ctx.files.entry_point + ctx.files.entry_points + ctx.files.srcs + ctx.files.deps
    outputs = [getattr(ctx.outputs, o) for o in dir(ctx.outputs)]

    # See CLI documentation at https://rollupjs.org/guide/en/#command-line-reference
    args = ctx.actions.args()

    # List entry point argument first to save some argv space
    # Rollup doc says
    # When provided as the first options, it is equivalent to not prefix them with --input
    for entry_point in _desugar_entry_points(ctx.attr.entry_point, ctx.attr.entry_points).items():
        args.add_joined([entry_point[1], _no_ext(entry_point[0])], join_with = "=")

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

    if ctx.attr.globals:
        args.add("--external")
        args.add_joined(ctx.attr.globals.keys(), join_with = ",")
        args.add("--globals")
        args.add_joined(["%s:%s" % g for g in ctx.attr.globals.items()], join_with = ",")

    ctx.actions.run(
        progress_message = "Bundling JavaScript %s [rollup]" % out_dir.short_path,
        executable = ctx.executable.rollup_bin,
        inputs = inputs,
        outputs = outputs,
        arguments = [args],
    )

rollup_bundle = rule(
    doc = _DOC,
    implementation = _rollup_bundle,
    attrs = _ROLLUP_ATTRS,
    outputs = _rollup_outs,
)

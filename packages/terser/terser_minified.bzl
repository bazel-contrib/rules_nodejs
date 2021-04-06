# Copyright 2019 The Bazel Authors. All rights reserved.
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

"Rule to run the terser binary under bazel"

load("@build_bazel_rules_nodejs//:providers.bzl", "JSModuleInfo", "run_node")

_DOC = """Run the terser minifier.

Typical example:
```python
load("@npm//@bazel/terser:index.bzl", "terser_minified")

terser_minified(
    name = "out.min",
    src = "input.js",
    config_file = "terser_config.json",
)
```

Note that the `name` attribute determines what the resulting files will be called.
So the example above will output `out.min.js` and `out.min.js.map` (since `sourcemap` defaults to `true`).
If the input is a directory, then the output will also be a directory, named after the `name` attribute.
Note that this rule is **NOT** recursive. It assumes a flat file structure. Passing in a folder with nested folder
will result in an empty output directory.
"""

_TERSER_ATTRS = {
    "args": attr.string_list(
        doc = """Additional command line arguments to pass to terser.

Terser only parses minify() args from the config file so additional arguments such as `--comments` may
be passed to the rule using this attribute. See https://github.com/terser/terser#command-line-usage for the
full list of terser CLI options.""",
    ),
    "config_file": attr.label(
        doc = """A JSON file containing Terser minify() options.

This is the file you would pass to the --config-file argument in terser's CLI.
https://github.com/terser-js/terser#minify-options documents the content of the file.

Bazel will make a copy of your config file, treating it as a template.

Run bazel with `--subcommands` to see the path to the copied file.

If you use the magic strings `"bazel_debug"` or `"bazel_no_debug"`, these will be
replaced with `true` and `false` respecting the value of the `debug` attribute
or the `--compilation_mode=dbg` bazel flag.

For example

```
{
    "compress": {
        "arrows": "bazel_no_debug"
    }
}
```

Will disable the `arrows` compression setting when debugging.

If `config_file` isn't supplied, Bazel will use a default config file.
""",
        allow_single_file = True,
        # These defaults match how terser was run in the legacy built-in rollup_bundle rule.
        # We keep them the same so it's easier for users to migrate.
        default = Label("//packages/terser:terser_config.default.json"),
    ),
    "debug": attr.bool(
        doc = """Configure terser to produce more readable output.

Instead of setting this attribute, consider using debugging compilation mode instead
bazel build --compilation_mode=dbg //my/terser:target
so that it only affects the current build.
""",
    ),
    "sourcemap": attr.bool(
        doc = "Whether to produce a .js.map output",
        default = True,
    ),
    "src": attr.label(
        doc = """File(s) to minify.

Can be a .js file, a rule producing .js files as its default output, or a rule producing a directory of .js files.

Note that you can pass multiple files to terser, which it will bundle together.
If you want to do this, you can pass a filegroup here.""",
        allow_files = [".js", ".map", ".mjs"],
        mandatory = True,
    ),
    "terser_bin": attr.label(
        doc = "An executable target that runs Terser",
        default = Label("//packages/terser/bin:terser"),
        executable = True,
        cfg = "host",
    ),
}

def _filter_js(files):
    return [f for f in files if f.is_directory or f.extension == "js" or f.extension == "mjs"]

def _terser(ctx):
    "Generate actions to create terser config run terser"

    # CLI arguments; see https://www.npmjs.com/package/terser#command-line-usage
    args = ctx.actions.args()

    inputs = []
    outputs = []

    # If src has a JSModuleInfo provider than use that otherwise use DefaultInfo files
    if JSModuleInfo in ctx.attr.src:
        inputs.extend(ctx.attr.src[JSModuleInfo].sources.to_list())
    else:
        inputs.extend(ctx.files.src[:])

    sources = _filter_js(inputs)
    sourcemaps = [f for f in inputs if f.extension == "map"]
    directory_srcs = [s for s in sources if s.is_directory]
    if len(directory_srcs) > 0:
        if len(sources) > 1:
            fail("When directories are passed to terser_minified, there should be only one input")
        outputs.append(ctx.actions.declare_directory(ctx.label.name))
    else:
        outputs.append(ctx.actions.declare_file("%s.js" % ctx.label.name))
        if ctx.attr.sourcemap:
            outputs.append(ctx.actions.declare_file("%s.js.map" % ctx.label.name))

    args.add_all([s.path for s in sources])
    args.add_all(["--output", outputs[0].path])

    debug = ctx.attr.debug or ctx.var["COMPILATION_MODE"] == "dbg"
    if debug:
        args.add("--debug")
        args.add("--beautify")

    if ctx.attr.sourcemap:
        # Source mapping options are comma-packed into one argv
        # see https://github.com/terser-js/terser#command-line-usage
        source_map_opts = ["includeSources", "base=" + ctx.bin_dir.path]

        if len(sourcemaps) == 0:
            source_map_opts.append("content=inline")
        elif len(sourcemaps) == 1:
            source_map_opts.append("content='%s'" % sourcemaps[0].path)
        else:
            fail("When sourcemap is True, there should only be one or none input sourcemaps")

        # Add a comment at the end of the js output so DevTools knows where to find the sourcemap
        source_map_opts.append("url='%s.js.map'" % ctx.label.name)

        # This option doesn't work in the config file, only on the CLI
        args.add_all(["--source-map", ",".join(source_map_opts)])

    opts = ctx.actions.declare_file("_%s.minify_options.json" % ctx.label.name)
    inputs.append(opts)
    ctx.actions.expand_template(
        template = ctx.file.config_file,
        output = opts,
        substitutions = {
            "\"bazel_debug\"": str(debug).lower(),
            "\"bazel_no_debug\"": str(not debug).lower(),
        },
    )

    args.add_all(["--config-file", opts.path])
    args.add_all(ctx.attr.args)

    run_node(
        ctx,
        inputs = inputs,
        outputs = outputs,
        executable = "terser_bin",
        arguments = [args],
        env = {"COMPILATION_MODE": ctx.var["COMPILATION_MODE"]},
        progress_message = "Minifying JavaScript %s [terser]" % (outputs[0].short_path),
    )

    outputs_depset = depset(outputs)

    return [
        DefaultInfo(files = outputs_depset),
        JSModuleInfo(
            direct_sources = outputs_depset,
            sources = outputs_depset,
        ),
    ]

terser_minified = rule(
    doc = _DOC,
    implementation = _terser,
    attrs = _TERSER_ATTRS,
)

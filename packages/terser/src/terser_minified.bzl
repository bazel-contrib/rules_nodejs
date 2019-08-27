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

_TERSER_ATTRS = {
    "src": attr.label(
        doc = """A JS file, or a rule producing .js as its default output

Note that you can pass multiple files to terser, which it will bundle together.
If you want to do this, you can pass a filegroup here.""",
        allow_files = [".js"],
        mandatory = True,
    ),
    "config_file": attr.label(
        doc = """A JSON file containing Terser minify() options.

This is the file you would pass to the --config-file argument in terser's CLI.
https://github.com/terser-js/terser#minify-options documents the content of the file.

Bazel will make a copy of your config file, treating it as a template.

> Run bazel with `--subcommands` to see the path to the copied file.

If you use the magic strings `"bazel_debug"` or `"bazel_no_debug"`, these will be
replaced with `true` and `false` respecting the value of the `debug` attribute
or the `--define=DEBUG=true` bazel flag.

For example,

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
        default = Label("@npm_bazel_terser//:terser_config.default.json"),
    ),
    "debug": attr.bool(
        doc = """Configure terser to produce more readable output.

Instead of setting this attribute, consider setting the DEBUG variable instead
bazel build --define=DEBUG=true //my/terser:target
so that it only affects the current build.
""",
    ),
    "sourcemap": attr.bool(
        doc = "Whether to produce a .js.map output",
        default = True,
    ),
    "terser_bin": attr.label(
        doc = "An executable target that runs Terser",
        default = Label("@npm//@bazel/terser/bin:terser"),
        executable = True,
        cfg = "host",
    ),
}

def _terser_outs(sourcemap):
    result = {"minified": "%{name}.js"}
    if sourcemap:
        result["sourcemap"] = "%{name}.js.map"
    return result

def _terser(ctx):
    "Generate actions to create terser config run terser"

    # CLI arguments; see https://www.npmjs.com/package/terser#command-line-usage
    args = ctx.actions.args()
    args.add_all([src.path for src in ctx.files.src])

    outputs = [ctx.outputs.minified]
    args.add_all(["--output", ctx.outputs.minified.path])

    debug = ctx.attr.debug or "DEBUG" in ctx.var.keys()
    if debug:
        args.add("--debug")
        args.add("--beautify")

    if ctx.attr.sourcemap:
        outputs.append(ctx.outputs.sourcemap)

        # Source mapping options are comma-packed into one argv
        # see https://github.com/terser-js/terser#command-line-usage
        source_map_opts = ["includeSources", "base=" + ctx.bin_dir.path]

        # We support only inline sourcemaps for now.
        # It's hard to pair up the .js inputs with corresponding .map files
        source_map_opts.append("content=inline")

        # This option doesn't work in the config file, only on the CLI
        args.add_all(["--source-map", ",".join(source_map_opts)])

    opts = ctx.actions.declare_file("_%s.minify_options.json" % ctx.label.name)
    ctx.actions.expand_template(
        template = ctx.file.config_file,
        output = opts,
        substitutions = {
            "\"bazel_debug\"": str(debug).lower(),
            "\"bazel_no_debug\"": str(not debug).lower(),
        },
    )

    args.add_all(["--config-file", opts.path])

    ctx.actions.run(
        inputs = ctx.files.src + [opts],
        outputs = outputs,
        executable = ctx.executable.terser_bin,
        arguments = [args],
        progress_message = "Minifying JavaScript %s [terser]" % (ctx.outputs.minified.short_path),
    )

terser_minified = rule(
    doc = """Run the terser minifier.
    
Typical example:
```python
load("@npm_bazel_terser//:index.bzl", "terser_minified")

terser_minified(
    name = "out.min",
    src = "input.js",
    config_file = "terser_config.json",
)
```

Note that the `name` attribute determines what the resulting files will be called.
So the example above will output `out.min.js` and `out.min.js.map` (since `sourcemap` defaults to `true`).
""",
    implementation = _terser,
    attrs = _TERSER_ATTRS,
    outputs = _terser_outs,
)

# Rollup rules for Bazel

The Rollup rules run the [rollup.js](https://rollupjs.org/) bundler with Bazel.

## Installation

Add the `@bazel/rollup` npm package to your `devDependencies` in `package.json`.

### Installing with user-managed dependencies

If you didn't use the `yarn_install` or `npm_install` rule, you'll have to declare a rule in your root `BUILD.bazel` file to execute rollup:

```python
# Create a rollup rule to use in rollup_bundle#rollup_bin
# attribute when using user-managed dependencies
nodejs_binary(
    name = "rollup_bin",
    entry_point = "//:node_modules/rollup/bin/rollup",
    # Point bazel to your node_modules to find the entry point
    data = ["//:node_modules"],
)
```

## Usage

The `rollup_bundle` rule is used to invoke Rollup on some JavaScript inputs.
The API docs appear [below](#rollup_bundle).

Typical example:
```python
load("@npm//@bazel/rollup:index.bzl", "rollup_bundle")

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

### Output types

You must determine ahead of time whether Rollup will write a single file or a directory.
Rollup's CLI has the same behavior, forcing you to pick `--output.file` or `--output.dir`.

Writing a directory is used when you have dynamic imports which cause code-splitting, or if you
provide multiple entry points. Use the `output_dir` attribute to specify that you want a
directory output.

Each `rollup_bundle` rule produces only one output by running the rollup CLI a single time.
To get multiple output formats, you can wrap the rule with a macro or list comprehension, e.g.

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

This will produce one output per requested format.

### Stamping

You can stamp the current version control info into the output by writing some code in your rollup config.
See the [stamping documentation](stamping).

By passing the `--stamp` option to Bazel, two additional input files will be readable by Rollup.

1. The variable `bazel_version_file` will point to `bazel-out/volatile-status.txt` which contains
statuses that change frequently; such changes do not cause a re-build of the rollup_bundle.
2. The variable `bazel_info_file` will point to `bazel-out/stable-status.txt` file which contains
statuses that stay the same; any changed values will cause rollup_bundle to rebuild.

Both `bazel_version_file` and `bazel_info_file` will be `undefined` if the build is run without `--stamp`.

> Note that under `--stamp`, only the bundle is re-built, but not the compilation steps that produced the inputs.
> This avoids a slow cascading re-build of a whole tree of actions.

To use these files, you write JS code in your `rollup.config.js` to read from the status files and parse the lines.
Each line is a space-separated key/value pair.

```javascript
// Parse the stamp file produced by Bazel from the version control system
let version = '<unknown>';
if (bazel_info_file) {
  const versionTag = require('fs')
                         .readFileSync(bazel_info_file, {encoding: 'utf-8'})
                         .split('\n')
                         .find(s => s.startsWith('STABLE_GIT_COMMIT'));
  if (versionTag) {
    version = 'v' + versionTag.split(' ')[1].trim();
  }
}
```

### Debug and Opt builds

When you use `--compilation_mode=dbg`, Bazel produces a distinct output-tree in `bazel-out/[arch]-dbg/bin`.
Code in your `rollup.config.js` can look in the environment to detect if a debug build is being performed,
and include extra developer information in the bundle that you wouldn't normally ship to production.

Similarly, `--compilation_mode=opt` is Bazel's signal to perform extra optimizations.
You could use this value to perform extra production-only optimizations.

For example you could define a constant for enabling Debug:

```javascript
const DEBUG = process.env['COMPILATION_MODE'] === 'dbg';
```

and configure Rollup differently when `DEBUG` is `true` or `false`.

### Increasing Heap memory for rollup

The `rollup_bin` attribute allows you to customize the rollup.js program we execute,
so you can use `nodejs_binary` to construct your own.

> You can always call `bazel query --output=build [default rollup_bin]` to see what
> the default definition looks like, then copy-paste from there to be sure yours
> matches.

```python
nodejs_binary(
    name = "rollup_more_mem",
    data = ["@npm//rollup:rollup"],
    entry_point = "@npm//:node_modules/rollup/dist/bin/rollup",
    templated_args = [
        "--node_options=--max-old-space-size=<SOME_SIZE>",
    ],
)

rollup_bundle(
    ...
    rollup_bin = ":rollup_more_mem",
)
```

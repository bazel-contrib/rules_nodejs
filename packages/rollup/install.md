# Rollup rules for Bazel

The Rollup rules run the Rollup.JS bundler with Bazel.

## Installation

Add the `@bazel/rollup` npm package to your `devDependencies` in `package.json`.

## Installing with self-managed dependencies

If you didn't use the `yarn_install` or `npm_install` rule, you'll have to declare a rule in your root `BUILD.bazel` file to execute rollup:

```python
# Create a rollup rule to use in rollup_bundle#rollup_bin
# attribute when using self-managed dependencies
nodejs_binary(
    name = "rollup_bin",
    entry_point = "//:node_modules/rollup/bin/rollup",
    # Point bazel to your node_modules to find the entry point
    node_modules = ["//:node_modules"],
)
```

## Usage

The `rollup_bundle` rule is used to invoke Rollup.js on some inputs.
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

## Output types

You must determine ahead of time whether Rollup needs to produce a directory output.
This is the case if you have dynamic imports which cause code-splitting, or if you
provide multiple entry points. Use the `output_dir` attribute to specify that you want a
directory output.
Rollup's CLI has the same behavior, forcing you to pick `--output.file` or `--output.dir`.

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

This will produce one output per requested format.

## Stamping

You can stamp the current version control info into the output by writing some code in your rollup config.
See the [stamping documentation](stamping).

By passing the `--stamp` option to Bazel, two additional input files will be readable by Rollup.

1. The variable `bazel_version_file` will point to the path of Bazel's "volatile-status.txt" file which contains
statuses that change frequently; such changes do not cause a re-build of the rollup_bundle.
2. The variable `bazel_info_file` will point to the path of Bazel's "stable-status.txt" file which contains
statuses that stay the same; any changed values will cause rollup_bundle to rebuild.

Both `bazel_version_file` and `bazel_info_file` will be `undefined` if the build is run without `--stamp`.

> Note that under `--stamp`, only the bundling is re-built, but not all the compilation steps.
> This avoids a slow cascading re-build of a whole tree of actions.

To use these files, just write JS code in the rollup.config.js that reads one of the status files and parses the lines.
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

## Debug and Opt builds

When you use `--compilation_mode=dbg`, Bazel produces a distinct output-tree in `bazel-out/[arch]-dbg/bin`.
Code in your rollup.config.js can look in the environment to detect if a Debug build is being performed,
and include extra developer information in the bundle that you wouldn't normally ship to production.

Similarly, `--compilation_mode=opt` is Bazel's signal to perform extra optimizations.
You could use this value to perform extra production-only optimizations.

For example you could define a constant for enabling Debug:

```javascript
const DEBUG = process.env['COMPILATION_MODE'] === 'dbg';
```

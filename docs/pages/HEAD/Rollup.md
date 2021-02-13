<!-- *********************
title: Rollup
toc: true
nav: rule
********************* -->
# Rollup rules for Bazel

The Rollup rules run the [rollup.js](https://rollupjs.org/) bundler with Bazel.

## Installation

Add the `@bazel/rollup` npm package to your `devDependencies` in `package.json`. (`rollup` itself should also be included in `devDependencies`, unless you plan on providing it via a custom target.)

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



## rollup_bundle
Runs the rollup.js CLI under Bazel.


#### Attributes


##### .attribute name (required)


###### .attribute-type Name
A unique name for this target.


##### .attribute args


###### .attribute-type String List
Command line arguments to pass to Rollup. Can be used to override config file settings.

These argument passed on the command line before arguments that are added by the rule.
Run `bazel` with `--subcommands` to see what Rollup CLI command line was invoked.

See the <a href="https://rollupjs.org/guide/en/#command-line-flags">Rollup CLI docs</a> for a complete list of supported arguments.


##### .attribute config_file


###### .attribute-type Label
A `rollup.config.js` file

Passed to the `--config` option, see [the config doc](https://rollupjs.org/guide/en/#configuration-files)

If not set, a default basic Rollup config is used.



##### .attribute deps


###### .attribute-type Label List
Other libraries that are required by the code, or by the rollup.config.js


##### .attribute entry_point


###### .attribute-type Label
The bundle's entry point (e.g. your main.js or app.js or index.js).

This is just a shortcut for the `entry_points` attribute with a single output chunk named the same as the rule.

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
        "index.js": "bundle"
    }
)
```

If `rollup_bundle` is used on a `ts_library`, the `rollup_bundle` rule handles selecting the correct outputs from `ts_library`.
In this case, `entry_point` can be specified as the `.ts` file and `rollup_bundle` will handle the mapping to the `.mjs` output file.

For example:

```python
ts_library(
    name = "foo",
    srcs = [
        "foo.ts",
        "index.ts",
    ],
)

rollup_bundle(
    name = "bundle",
    deps = [ "foo" ],
    entry_point = "index.ts",
)
```



##### .attribute entry_points


###### .attribute-type Label String Dict
The bundle's entry points (e.g. your main.js or app.js or index.js).

Passed to the [`--input` option](https://github.com/rollup/rollup/blob/master/docs/999-big-list-of-options.md#input) in Rollup.

Keys in this dictionary are labels pointing to .js entry point files.
Values are the name to be given to the corresponding output chunk.

Either this attribute or `entry_point` must be specified, but not both.



##### .attribute format


###### .attribute-type String
Specifies the format of the generated bundle. One of the following:

- `amd`: Asynchronous Module Definition, used with module loaders like RequireJS
- `cjs`: CommonJS, suitable for Node and other bundlers
- `esm`: Keep the bundle as an ES module file, suitable for other bundlers and inclusion as a `<script type=module>` tag in modern browsers
- `iife`: A self-executing function, suitable for inclusion as a `<script>` tag. (If you want to create a bundle for your application, you probably want to use this.)
- `umd`: Universal Module Definition, works as amd, cjs and iife all in one
- `system`: Native format of the SystemJS loader



##### .attribute link_workspace_root


###### .attribute-type Boolean
Link the workspace root to the bin_dir to support absolute requires like 'my_wksp/path/to/file'.
If source files need to be required then they can be copied to the bin_dir with copy_to_bin.


##### .attribute node_context_data


###### .attribute-type Label
Provides info about the build context, such as stamping.
        
By default it reads from the bazel command line, such as the `--stamp` argument.
Use this to override values for this target, such as enabling or disabling stamping.
You can use the `node_context_data` rule in `@build_bazel_rules_nodejs//internal/node:context.bzl`
to create a NodeContextInfo.



##### .attribute output_dir


###### .attribute-type Boolean
Whether to produce a directory output.

We will use the [`--output.dir` option](https://github.com/rollup/rollup/blob/master/docs/999-big-list-of-options.md#outputdir) in rollup
rather than `--output.file`.

If the program produces multiple chunks, you must specify this attribute.
Otherwise, the outputs are assumed to be a single file.



##### .attribute rollup_bin


###### .attribute-type Label
Target that executes the rollup binary


##### .attribute rollup_worker_bin


###### .attribute-type Label
Internal use only


##### .attribute silent


###### .attribute-type Boolean
Whether to execute the rollup binary with the --silent flag, defaults to False.

Using --silent can cause rollup to [ignore errors/warnings](https://github.com/rollup/rollup/blob/master/docs/999-big-list-of-options.md#onwarn) 
which are only surfaced via logging.  Since bazel expects printing nothing on success, setting silent to True
is a more Bazel-idiomatic experience, however could cause rollup to drop important warnings.



##### .attribute sourcemap


###### .attribute-type String
Whether to produce sourcemaps.

Passed to the [`--sourcemap` option](https://github.com/rollup/rollup/blob/master/docs/999-big-list-of-options.md#outputsourcemap") in Rollup



##### .attribute srcs


###### .attribute-type Label List
Non-entry point JavaScript source files from the workspace.

You must not repeat file(s) passed to entry_point/entry_points.



##### .attribute supports_workers


###### .attribute-type Boolean
Experimental! Use only with caution.

Allows you to enable the Bazel Worker strategy for this library.
When enabled, this rule invokes the "rollup_worker_bin"
worker aware binary rather than "rollup_bin".

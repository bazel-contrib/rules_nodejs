<!-- *********************
title: Terser
toc: true
nav: rule
********************* -->
# Terser rules for Bazel

The Terser rules run the Terser JS minifier with Bazel.

Wraps the Terser CLI documented at https://github.com/terser-js/terser#command-line-usage

## Installation

Add the `@bazel/terser` npm package to your `devDependencies` in `package.json`.

## Installing with user-managed dependencies

If you didn't use the `yarn_install` or `npm_install` rule, you'll have to declare a rule in your root `BUILD.bazel` file to execute terser:

```python
# Create a terser rule to use in terser_minified#terser_bin
# attribute when using user-managed dependencies
nodejs_binary(
    name = "terser_bin",
    entry_point = "//:node_modules/terser/bin/uglifyjs",
    # Point bazel to your node_modules to find the entry point
    data = ["//:node_modules"],
)
```




## terser_minified
Run the terser minifier.

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



#### Attributes


##### .attribute name (required)


###### .attribute-type Name
A unique name for this target.


##### .attribute args


###### .attribute-type String List
Additional command line arguments to pass to terser.

Terser only parses minify() args from the config file so additional arguments such as `--comments` may
be passed to the rule using this attribute. See https://github.com/terser/terser#command-line-usage for the
full list of terser CLI options.


##### .attribute config_file


###### .attribute-type Label
A JSON file containing Terser minify() options.

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



##### .attribute debug


###### .attribute-type Boolean
Configure terser to produce more readable output.

Instead of setting this attribute, consider using debugging compilation mode instead
bazel build --compilation_mode=dbg //my/terser:target
so that it only affects the current build.



##### .attribute sourcemap


###### .attribute-type Boolean
Whether to produce a .js.map output


##### .attribute src (required)


###### .attribute-type Label
File(s) to minify.

Can be a .js file, a rule producing .js files as its default output, or a rule producing a directory of .js files.

Note that you can pass multiple files to terser, which it will bundle together.
If you want to do this, you can pass a filegroup here.


##### .attribute terser_bin


###### .attribute-type Label
An executable target that runs Terser

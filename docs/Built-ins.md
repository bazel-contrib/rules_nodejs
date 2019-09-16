---
title: Built-ins
layout: default
stylesheet: docs
---
# Built-in rules

These rules are available without any npm installation, via the `WORKSPACE` install of the `build_bazel_rules_nodejs` workspace. This is necessary to bootstrap Bazel to run the package manager to download other rules from NPM.


[name]: https://bazel.build/docs/build-ref.html#name
[label]: https://bazel.build/docs/build-ref.html#labels
[labels]: https://bazel.build/docs/build-ref.html#labels


## nodejs_binary

Runs some JavaScript code in NodeJS.


### Usage

```
nodejs_binary(name, bootstrap, configuration_env_vars, data, default_env_vars, entry_point, install_source_map_support, node_modules, templated_args, templated_args_file)
```



#### `name`
(*[name], mandatory*): A unique name for this target.


#### `bootstrap`
(*List of strings*): JavaScript modules to be loaded before the entry point.
        For example, Angular uses this to patch the Jasmine async primitives for
        zone.js before the first `describe`.


#### `configuration_env_vars`
(*List of strings*): Pass these configuration environment variables to the resulting binary.
        Chooses a subset of the configuration environment variables (taken from `ctx.var`), which also
        includes anything specified via the --define flag.
        Note, this can lead to different outputs produced by this rule.


#### `data`
(*[labels]*): Runtime dependencies which may be loaded during execution.


#### `default_env_vars`
(*List of strings*): Default environment variables that are added to `configuration_env_vars`.

This is separate from the default of `configuration_env_vars` so that a user can set `configuration_env_vars`
without losing the defaults that should be set in most cases.

The set of default  environment variables is:

- `DEBUG`: rules use this environment variable to turn on debug information in their output artifacts
- `VERBOSE_LOGS`: rules use this environment variable to turn on debug output in their logs


#### `entry_point`
(*[label], mandatory*): The script which should be executed first, usually containing a main function.

If the entry JavaScript file belongs to the same package (as the BUILD file),
you can simply reference it by its relative name to the package directory:

```
nodejs_binary(
    name = "my_binary",
    ...
    entry_point = ":file.js",
)
```

You can specify the entry point as a typescript file so long as you also include
the ts_library target in data:

```
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

```
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

```
nodejs_binary(
    name = "history-server",
    entry_point = "@npm//:node_modules/history-server/modules/cli.js",
    data = ["@npm//history-server"],
)
```


#### `install_source_map_support`
(*Boolean*): Install the source-map-support package.
        Enable this to get stack traces that point to original sources, e.g. if the program was written
        in TypeScript.


#### `node_modules`
(*[label]*): The npm packages which should be available to `require()` during
        execution.

This attribute is DEPRECATED. As of version 0.13.0 the recommended approach
to npm dependencies is to use fine grained npm dependencies which are setup
with the `yarn_install` or `npm_install` rules. For example, in targets
that used a `//:node_modules` filegroup,

```
nodejs_binary(
    name = "my_binary",
    ...
    node_modules = "//:node_modules",
)
```

which specifies all files within the `//:node_modules` filegroup
to be inputs to the `my_binary`. Using fine grained npm dependencies,
`my_binary` is defined with only the npm dependencies that are
needed:

```
nodejs_binary(
    name = "my_binary",
    ...
    data = [
        "@npm//foo",
        "@npm//bar",
        ...
    ],
)
```

In this case, only the `foo` and `bar` npm packages and their
transitive deps are includes as inputs to the `my_binary` target
which reduces the time required to setup the runfiles for this
target (see https://github.com/bazelbuild/bazel/issues/5153).

The @npm external repository and the fine grained npm package
targets are setup using the `yarn_install` or `npm_install` rule
in your WORKSPACE file:

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

For other rules such as `jasmine_node_test`, fine grained
npm dependencies are specified in the `deps` attribute:

```
jasmine_node_test(
    name = "my_test",
    ...
    deps = [
        "@npm//jasmine",
        "@npm//foo",
        "@npm//bar",
        ...
    ],
)
```


#### `templated_args`
(*List of strings*): Arguments which are passed to every execution of the program.
        To pass a node startup option, prepend it with `--node_options=`, e.g.
        `--node_options=--preserve-symlinks`


#### `templated_args_file`
(*<a href="https://bazel.build/docs/build-ref.html#labels">Label</a>*): If specified, arguments specified in `templated_args` are instead written to this file,
        which is then passed as an argument to the program. Arguments prefixed with `--node_options=` are
        passed directly to node and not included in the params file.



## nodejs_test


Identical to `nodejs_binary`, except this can be used with `bazel test` as well.
When the binary returns zero exit code, the test passes; otherwise it fails.

`nodejs_test` is a convenient way to write a novel kind of test based on running
your own test runner. For example, the `ts-api-guardian` library has a way to
assert the public API of a TypeScript program, and uses `nodejs_test` here:
https://github.com/angular/angular/blob/master/tools/ts-api-guardian/index.bzl

If you just want to run a standard test using a test runner like Karma or Jasmine,
use the specific rules for those test runners, e.g. `jasmine_node_test`.

To debug a Node.js test, we recommend saving a group of flags together in a "config".
Put this in your `tools/bazel.rc` so it's shared with your team:
```
# Enable debugging tests with --config=debug
test:debug --test_arg=--node_options=--inspect-brk --test_output=streamed --test_strategy=exclusive --test_timeout=9999 --nocache_test_results
```

Now you can add `--config=debug` to any `bazel test` command line.
The runtime will pause before executing the program, allowing you to connect a
remote debugger.



### Usage

```
nodejs_test(name, bootstrap, configuration_env_vars, data, default_env_vars, entry_point, expected_exit_code, install_source_map_support, node_modules, templated_args, templated_args_file)
```



#### `name`
(*[name], mandatory*): A unique name for this target.


#### `bootstrap`
(*List of strings*): JavaScript modules to be loaded before the entry point.
        For example, Angular uses this to patch the Jasmine async primitives for
        zone.js before the first `describe`.


#### `configuration_env_vars`
(*List of strings*): Pass these configuration environment variables to the resulting binary.
        Chooses a subset of the configuration environment variables (taken from `ctx.var`), which also
        includes anything specified via the --define flag.
        Note, this can lead to different outputs produced by this rule.


#### `data`
(*[labels]*): Runtime dependencies which may be loaded during execution.


#### `default_env_vars`
(*List of strings*): Default environment variables that are added to `configuration_env_vars`.

This is separate from the default of `configuration_env_vars` so that a user can set `configuration_env_vars`
without losing the defaults that should be set in most cases.

The set of default  environment variables is:

- `DEBUG`: rules use this environment variable to turn on debug information in their output artifacts
- `VERBOSE_LOGS`: rules use this environment variable to turn on debug output in their logs


#### `entry_point`
(*[label], mandatory*): The script which should be executed first, usually containing a main function.

If the entry JavaScript file belongs to the same package (as the BUILD file),
you can simply reference it by its relative name to the package directory:

```
nodejs_binary(
    name = "my_binary",
    ...
    entry_point = ":file.js",
)
```

You can specify the entry point as a typescript file so long as you also include
the ts_library target in data:

```
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

```
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

```
nodejs_binary(
    name = "history-server",
    entry_point = "@npm//:node_modules/history-server/modules/cli.js",
    data = ["@npm//history-server"],
)
```


#### `expected_exit_code`
(*Integer*): The expected exit code for the test. Defaults to 0.


#### `install_source_map_support`
(*Boolean*): Install the source-map-support package.
        Enable this to get stack traces that point to original sources, e.g. if the program was written
        in TypeScript.


#### `node_modules`
(*[label]*): The npm packages which should be available to `require()` during
        execution.

This attribute is DEPRECATED. As of version 0.13.0 the recommended approach
to npm dependencies is to use fine grained npm dependencies which are setup
with the `yarn_install` or `npm_install` rules. For example, in targets
that used a `//:node_modules` filegroup,

```
nodejs_binary(
    name = "my_binary",
    ...
    node_modules = "//:node_modules",
)
```

which specifies all files within the `//:node_modules` filegroup
to be inputs to the `my_binary`. Using fine grained npm dependencies,
`my_binary` is defined with only the npm dependencies that are
needed:

```
nodejs_binary(
    name = "my_binary",
    ...
    data = [
        "@npm//foo",
        "@npm//bar",
        ...
    ],
)
```

In this case, only the `foo` and `bar` npm packages and their
transitive deps are includes as inputs to the `my_binary` target
which reduces the time required to setup the runfiles for this
target (see https://github.com/bazelbuild/bazel/issues/5153).

The @npm external repository and the fine grained npm package
targets are setup using the `yarn_install` or `npm_install` rule
in your WORKSPACE file:

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

For other rules such as `jasmine_node_test`, fine grained
npm dependencies are specified in the `deps` attribute:

```
jasmine_node_test(
    name = "my_test",
    ...
    deps = [
        "@npm//jasmine",
        "@npm//foo",
        "@npm//bar",
        ...
    ],
)
```


#### `templated_args`
(*List of strings*): Arguments which are passed to every execution of the program.
        To pass a node startup option, prepend it with `--node_options=`, e.g.
        `--node_options=--preserve-symlinks`


#### `templated_args_file`
(*<a href="https://bazel.build/docs/build-ref.html#labels">Label</a>*): If specified, arguments specified in `templated_args` are instead written to this file,
        which is then passed as an argument to the program. Arguments prefixed with `--node_options=` are
        passed directly to node and not included in the params file.



## npm_install

Runs npm install during workspace setup.


### Usage

```
npm_install(name, always_hide_bazel_files, data, dynamic_deps, exclude_packages, included_files, manual_build_file_contents, package_json, package_lock_json, prod_only, quiet, symlink_node_modules, timeout)
```



#### `name`
(*[name], mandatory*): A unique name for this repository.


#### `always_hide_bazel_files`
(*Boolean*): Always hide Bazel build files such as `BUILD` and BUILD.bazel` by prefixing them with `_`.
        
Defaults to False, in which case Bazel files are _not_ hidden when `symlink_node_modules`
is True. In this case, the rule will report an error when there are Bazel files detected
in npm packages.

Reporting the error is desirable as relying on this repository rule to hide
these files does not work in the case where a user deletes their node_modules folder
and manually re-creates it with yarn or npm outside of Bazel which would restore them.
On a subsequent Bazel build, this repository rule does not re-run and the presence
of the Bazel files leads to a build failure that looks like the following:

```
ERROR: /private/var/tmp/_bazel_greg/37b273501bbecefcf5ce4f3afcd7c47a/external/npm/BUILD.bazel:9:1:
Label '@npm//:node_modules/rxjs/src/AsyncSubject.ts' crosses boundary of subpackage '@npm//node_modules/rxjs/src'
(perhaps you meant to put the colon here: '@npm//node_modules/rxjs/src:AsyncSubject.ts'?)
```

See https://github.com/bazelbuild/rules_nodejs/issues/802 for more details.

The recommended solution is to use the @bazel/hide-bazel-files utility to hide these files.
See https://github.com/bazelbuild/rules_nodejs/blob/master/packages/hide-bazel-files/README.md
for installation instructions.

The alternate solution is to set `always_hide_bazel_files` to True which tell
this rule to hide Bazel files even when `symlink_node_modules` is True. This means
you won't need to use `@bazel/hide-bazel-files` utility but if you manually recreate
your `node_modules` folder via yarn or npm outside of Bazel you may run into the above
error.


#### `data`
(*[labels]*): Data files required by this rule.

If symlink_node_modules is True, this attribute is ignored since
the dependency manager will run in the package.json location.


#### `dynamic_deps`
(*<a href="https://bazel.build/docs/skylark/lib/dict.html">Dictionary: String -> String</a>*): Declare implicit dependencies between npm packages.

In many cases, an npm package doesn't list a dependency on another package, yet still require()s it.
One example is plugins, where a tool like rollup can require rollup-plugin-json if the user installed it.
Another example is the tsc_wrapped binary in @bazel/typescript which can require tsickle if its installed.
Under Bazel, we must declare these dependencies so that they are included as inputs to the program.

Note that the pattern used by many packages, which have plugins in the form pkg-plugin-someplugin, are automatically
added as implicit dependencies. Thus for example, `rollup` will automatically get `rollup-plugin-json` included in its
dependencies without needing to use this attribute.

The keys in the dict are npm package names, and the value may be a particular package, or a prefix ending with *.     
For example, `dynamic_deps = {"@bazel/typescript": "tsickle", "karma": "my-karma-plugin-*"}`

Note, this may sound like "optionalDependencies" but that field in package.json actually means real dependencies
which are installed, but failures on installation are ignored.


#### `exclude_packages`
(*List of strings*): DEPRECATED. This attribute is no longer used.


#### `included_files`
(*List of strings*): List of file extensions to be included in the npm package targets.

For example, [".js", ".d.ts", ".proto", ".json", ""].

This option is useful to limit the number of files that are inputs
to actions that depend on npm package targets. See
https://github.com/bazelbuild/bazel/issues/5153.

If set to an empty list then all files are included in the package targets.
If set to a list of extensions, only files with matching extensions are
included in the package targets. An empty string in the list is a special
string that denotes that files with no extensions such as `README` should
be included in the package targets.

This attribute applies to both the coarse `@wksp//:node_modules` target
as well as the fine grained targets such as `@wksp//foo`.


#### `manual_build_file_contents`
(*String*): Experimental attribute that can be used to override the generated BUILD.bazel file and set its contents manually.

Can be used to work-around a bazel performance issue if the
default `@wksp//:node_modules` target has too many files in it.
See https://github.com/bazelbuild/bazel/issues/5153. If
you are running into performance issues due to a large
node_modules target it is recommended to switch to using
fine grained npm dependencies.


#### `package_json`
(*[label], mandatory*)


#### `package_lock_json`
(*[label], mandatory*)


#### `prod_only`
(*Boolean*): Don't install devDependencies


#### `quiet`
(*Boolean*): If stdout and stderr should be printed to the terminal.


#### `symlink_node_modules`
(*Boolean*): Turn symlinking of node_modules on
        
This requires the use of Bazel 0.26.0 and the experimental
managed_directories feature.

When true, the package manager will run in the package.json folder
and the resulting node_modules folder will be symlinked into the
external repository create by this rule.

When false, the package manager will run in the external repository
created by this rule and any files other than the package.json file and
the lock file that are required for it to run should be listed in the
data attribute.


#### `timeout`
(*Integer*): Maximum duration of the command "npm install" in seconds
            (default is 3600 seconds).



## npm_package

The npm_package rule creates a directory containing a publishable npm artifact.

Example:

```python
load("@build_bazel_rules_nodejs//:defs.bzl", "npm_package")

npm_package(
    name = "my_package",
    srcs = ["package.json"],
    deps = [":my_typescript_lib"],
    replacements = {"//internal/": "//"},
)
```

You can use a pair of `// BEGIN-INTERNAL ... // END-INTERNAL` comments to mark regions of files that should be elided during publishing.
For example:

```javascript
function doThing() {
    // BEGIN-INTERNAL
    // This is a secret internal-only comment
    doInternalOnlyThing();
    // END-INTERNAL
}
```

Usage:

`npm_package` yields three labels. Build the package directory using the default label:

```sh
$ bazel build :my_package
Target //:my_package up-to-date:
  bazel-out/fastbuild/bin/my_package
$ ls -R bazel-out/fastbuild/bin/my_package
```

Dry-run of publishing to npm, calling `npm pack` (it builds the package first if needed):

```sh
$ bazel run :my_package.pack
INFO: Running command line: bazel-out/fastbuild/bin/my_package.pack
my-package-name-1.2.3.tgz
$ tar -tzf my-package-name-1.2.3.tgz
```

Actually publish the package with `npm publish` (also builds first):

```sh
# Check login credentials
$ bazel run @nodejs//:npm who
# Publishes the package
$ bazel run :my_package.publish
```

You can pass arguments to npm by escaping them from Bazel using a double-hyphen `bazel run my_package.publish -- --tag=next`



### Usage

```
npm_package(name, deps, packages, rename_build_files, replace_with_version, replacements, srcs, vendor_external)
```



#### `name`
(*[name], mandatory*): A unique name for this target.


#### `deps`
(*[labels]*): Other targets which produce files that should be included in the package, such as `rollup_bundle`


#### `packages`
(*[labels]*): Other npm_package rules whose content is copied into this package.


#### `rename_build_files`
(*Boolean*): If set BUILD and BUILD.bazel files are prefixed with `_` in the npm package.
        The default is True since npm packages that contain BUILD files don't work with
        `yarn_install` and `npm_install` without a post-install step that deletes or renames them.


#### `replace_with_version`
(*String*): If set this value is replaced with the version stamp data.
        See the section on stamping in the README.


#### `replacements`
(*<a href="https://bazel.build/docs/skylark/lib/dict.html">Dictionary: String -> String</a>*): Key-value pairs which are replaced in all the files while building the package.


#### `srcs`
(*[labels]*): Files inside this directory which are simply copied into the package.


#### `vendor_external`
(*List of strings*): External workspaces whose contents should be vendored into this workspace.
        Avoids 'external/foo' path segments in the resulting package.



## rollup_bundle

Produces several bundled JavaScript files using Rollup and terser.

Load it with
`load("@build_bazel_rules_nodejs//:defs.bzl", "rollup_bundle")`

It performs this work in several separate processes:
1. Call rollup on the original sources
2. Downlevel the resulting code to es5 syntax for older browsers
3. Minify the bundle with terser, possibly with pretty output for human debugging.

The default output of a `rollup_bundle` rule is the non-debug-minified es5 bundle.

However you can request one of the other outputs with a dot-suffix on the target's name.
For example, if your `rollup_bundle` is named `my_rollup_bundle`, you can use one of these labels:

To request the ES2015 syntax (e.g. `class` keyword) without downleveling or minification, use the `:my_rollup_bundle.es2015.js` label.
To request the ES5 downleveled bundle without minification, use the `:my_rollup_bundle.js` label
To request the debug-minified es5 bundle, use the `:my_rollup_bundle.min_debug.js` label.
To request a UMD-bundle, use the `:my_rollup_bundle.umd.js` label.
To request a CommonJS bundle, use the `:my_rollup_bundle.cjs.js` label.

You can also request an analysis from source-map-explorer by buildng the `:my_rollup_bundle.explore.html` label.
However this is currently broken for `rollup_bundle` ES5 mode because we use tsc for downleveling and
it doesn't compose the resulting sourcemaps with an input sourcemap.
See https://github.com/bazelbuild/rules_nodejs/issues/175

For debugging, note that the `rollup.config.js` and `terser.config.json` files can be found in the bazel-bin folder next to the resulting bundle.

An example usage can be found in https://github.com/bazelbuild/rules_nodejs/tree/master/internal/rollup/test/rollup



### Usage

```
rollup_bundle(name, additional_entry_points, deps, enable_code_splitting, entry_point, global_name, globals, license_banner, node_modules, srcs)
```



#### `name`
(*[name], mandatory*): A unique name for this target.


#### `additional_entry_points`
(*List of strings*): Additional entry points of the application for code splitting, passed as the input to rollup.
        These should be a path relative to the workspace root.

        When additional_entry_points are specified, rollup_bundle
        will split the bundle in multiple entry points and chunks.
        There will be a main entry point chunk as well as entry point
        chunks for each additional_entry_point. The file names
        of these entry points will correspond to the file names
        specified in entry_point and additional_entry_points.
        There will also be one or more common chunks that are shared
        between entry points named chunk-<HASH>.js. The number
        of common chunks is variable depending on the code being
        bundled.

        Entry points and chunks will be outputted to folders:
        - <label-name>_chunks_es2015 // es2015
        - <label-name>_chunks // es5
        - <label-name>_chunks_min // es5 minified
        - <label-name>_chunks_min_debug // es5 minified debug

        The following files will be outputted that contain the
        SystemJS boilerplate to map the entry points to their file
        names and load the main entry point:
        flavors:
        - <label-name>.es2015.js // es2015 with EcmaScript modules
        - <label-name>.js // es5 syntax with CJS modules
        - <label-name>.min.js // es5 minified
        - <label-name>.min_debug.js // es5 minified debug

        NOTE: additional_entry_points MUST be in the same folder or deeper than
        the main entry_point for the SystemJS boilerplate/entry point to
        be valid. For example, if the main entry_point is
        `src/main` then all additional_entry_points must be under
        `src/**` such as `src/bar` or `src/foo/bar`. Alternate
        additional_entry_points configurations are valid but the
        SystemJS boilerplate/entry point files will not be usable and
        it is up to the user in these cases to handle the SystemJS
        boilerplate manually.

        It is sufficient to load one of these SystemJS boilerplate/entry point
        files as a script in your HTML to load your application


#### `deps`
(*[labels]*): Other rules that produce JavaScript outputs, such as `ts_library`.


#### `enable_code_splitting`
(*Boolean*): If True rollup will automatically determine entry points from
        the source code. The rollup output format will be 'esm' and rollup will
        create entry points based on ES6 import statements. See
        https://rollupjs.org/guide/en#code-splitting

        Code splitting is always enabled when additional_entry_points is
        non-empty.

        All automatic entry points will be named chunk-<HASH>.js.


#### `entry_point`
(*[label], mandatory*): The starting point of the application, passed as the `--input` flag to rollup.

        If the entry JavaScript file belongs to the same package (as the BUILD file), 
        you can simply reference it by its relative name to the package directory:

        ```
        rollup_bundle(
            name = "bundle",
            entry_point = ":main.js",
        )
        ```

        You can specify the entry point as a typescript file so long as you also include
        the ts_library target in deps:

        ```
        ts_library(
            name = "main",
            srcs = ["main.ts"],
        )

        rollup_bundle(
            name = "bundle",
            deps = [":main"]
            entry_point = ":main.ts",
        )
        ```

        The rule will use the corresponding `.js` output of the ts_library rule as the entry point.

        If the entry point target is a rule, it should produce a single JavaScript entry file that will be passed to the nodejs_binary rule. 
        For example:

        ```
        filegroup(
            name = "entry_file",
            srcs = ["main.js"],
        )

        rollup_bundle(
            name = "bundle",
            entry_point = ":entry_file",
        )
        ```


#### `global_name`
(*String*): A name given to this package when referenced as a global variable.
        This name appears in the bundle module incantation at the beginning of the file,
        and governs the global symbol added to the global context (e.g. `window`) as a side-
        effect of loading the UMD/IIFE JS bundle.

        Rollup doc: "The variable name, representing your iife/umd bundle, by which other scripts on the same page can access it."

        This is passed to the `output.name` setting in Rollup.


#### `globals`
(*<a href="https://bazel.build/docs/skylark/lib/dict.html">Dictionary: String -> String</a>*): A dict of symbols that reference external scripts.
        The keys are variable names that appear in the program,
        and the values are the symbol to reference at runtime in a global context (UMD bundles).
        For example, a program referencing @angular/core should use ng.core
        as the global reference, so Angular users should include the mapping
        `"@angular/core":"ng.core"` in the globals.


#### `license_banner`
(*[label]*): A .txt file passed to the `banner` config option of rollup.
        The contents of the file will be copied to the top of the resulting bundles.
        Note that you can replace a version placeholder in the license file, by using
        the special version `0.0.0-PLACEHOLDER`. See the section on stamping in the README.


#### `node_modules`
(*[label]*): Dependencies from npm that provide some modules that must be
        resolved by rollup.

        This attribute is DEPRECATED. As of version 0.13.0 the recommended approach
        to npm dependencies is to use fine grained npm dependencies which are setup
        with the `yarn_install` or `npm_install` rules. For example, in a rollup_bundle
        target that used the `node_modules` attribute,

        ```
        rollup_bundle(
          name = "bundle",
          ...
          node_modules = "//:node_modules",
        )
        ```

        which specifies all files within the `//:node_modules` filegroup
        to be inputs to the `bundle`. Using fine grained npm dependencies,
        `bundle` is defined with only the npm dependencies that are
        needed:

        ```
        rollup_bundle(
          name = "bundle",
          ...
          deps = [
              "@npm//foo",
              "@npm//bar",
              ...
          ],
        )
        ```

        In this case, only the `foo` and `bar` npm packages and their
        transitive deps are includes as inputs to the `bundle` target
        which reduces the time required to setup the runfiles for this
        target (see https://github.com/bazelbuild/bazel/issues/5153).

        The @npm external repository and the fine grained npm package
        targets are setup using the `yarn_install` or `npm_install` rule
        in your WORKSPACE file:

        yarn_install(
          name = "npm",
          package_json = "//:package.json",
          yarn_lock = "//:yarn.lock",
        )


#### `srcs`
(*[labels]*): JavaScript source files from the workspace.
        These can use ES2015 syntax and ES Modules (import/export)



## yarn_install

Runs yarn install during workspace setup.


### Usage

```
yarn_install(name, always_hide_bazel_files, data, dynamic_deps, exclude_packages, frozen_lockfile, included_files, manual_build_file_contents, network_timeout, package_json, prod_only, quiet, symlink_node_modules, timeout, use_global_yarn_cache, yarn_lock)
```



#### `name`
(*[name], mandatory*): A unique name for this repository.


#### `always_hide_bazel_files`
(*Boolean*): Always hide Bazel build files such as `BUILD` and BUILD.bazel` by prefixing them with `_`.
        
Defaults to False, in which case Bazel files are _not_ hidden when `symlink_node_modules`
is True. In this case, the rule will report an error when there are Bazel files detected
in npm packages.

Reporting the error is desirable as relying on this repository rule to hide
these files does not work in the case where a user deletes their node_modules folder
and manually re-creates it with yarn or npm outside of Bazel which would restore them.
On a subsequent Bazel build, this repository rule does not re-run and the presence
of the Bazel files leads to a build failure that looks like the following:

```
ERROR: /private/var/tmp/_bazel_greg/37b273501bbecefcf5ce4f3afcd7c47a/external/npm/BUILD.bazel:9:1:
Label '@npm//:node_modules/rxjs/src/AsyncSubject.ts' crosses boundary of subpackage '@npm//node_modules/rxjs/src'
(perhaps you meant to put the colon here: '@npm//node_modules/rxjs/src:AsyncSubject.ts'?)
```

See https://github.com/bazelbuild/rules_nodejs/issues/802 for more details.

The recommended solution is to use the @bazel/hide-bazel-files utility to hide these files.
See https://github.com/bazelbuild/rules_nodejs/blob/master/packages/hide-bazel-files/README.md
for installation instructions.

The alternate solution is to set `always_hide_bazel_files` to True which tell
this rule to hide Bazel files even when `symlink_node_modules` is True. This means
you won't need to use `@bazel/hide-bazel-files` utility but if you manually recreate
your `node_modules` folder via yarn or npm outside of Bazel you may run into the above
error.


#### `data`
(*[labels]*): Data files required by this rule.

If symlink_node_modules is True, this attribute is ignored since
the dependency manager will run in the package.json location.


#### `dynamic_deps`
(*<a href="https://bazel.build/docs/skylark/lib/dict.html">Dictionary: String -> String</a>*): Declare implicit dependencies between npm packages.

In many cases, an npm package doesn't list a dependency on another package, yet still require()s it.
One example is plugins, where a tool like rollup can require rollup-plugin-json if the user installed it.
Another example is the tsc_wrapped binary in @bazel/typescript which can require tsickle if its installed.
Under Bazel, we must declare these dependencies so that they are included as inputs to the program.

Note that the pattern used by many packages, which have plugins in the form pkg-plugin-someplugin, are automatically
added as implicit dependencies. Thus for example, `rollup` will automatically get `rollup-plugin-json` included in its
dependencies without needing to use this attribute.

The keys in the dict are npm package names, and the value may be a particular package, or a prefix ending with *.     
For example, `dynamic_deps = {"@bazel/typescript": "tsickle", "karma": "my-karma-plugin-*"}`

Note, this may sound like "optionalDependencies" but that field in package.json actually means real dependencies
which are installed, but failures on installation are ignored.


#### `exclude_packages`
(*List of strings*): DEPRECATED. This attribute is no longer used.


#### `frozen_lockfile`
(*Boolean*): Passes the --frozen-lockfile flag to prevent updating yarn.lock.
            
Note that enabling this option will require that you run yarn outside of Bazel
when making changes to package.json.


#### `included_files`
(*List of strings*): List of file extensions to be included in the npm package targets.

For example, [".js", ".d.ts", ".proto", ".json", ""].

This option is useful to limit the number of files that are inputs
to actions that depend on npm package targets. See
https://github.com/bazelbuild/bazel/issues/5153.

If set to an empty list then all files are included in the package targets.
If set to a list of extensions, only files with matching extensions are
included in the package targets. An empty string in the list is a special
string that denotes that files with no extensions such as `README` should
be included in the package targets.

This attribute applies to both the coarse `@wksp//:node_modules` target
as well as the fine grained targets such as `@wksp//foo`.


#### `manual_build_file_contents`
(*String*): Experimental attribute that can be used to override the generated BUILD.bazel file and set its contents manually.

Can be used to work-around a bazel performance issue if the
default `@wksp//:node_modules` target has too many files in it.
See https://github.com/bazelbuild/bazel/issues/5153. If
you are running into performance issues due to a large
node_modules target it is recommended to switch to using
fine grained npm dependencies.


#### `network_timeout`
(*Integer*): Maximum duration of a network request made by yarn in seconds
            (default is 300 seconds).


#### `package_json`
(*[label], mandatory*)


#### `prod_only`
(*Boolean*): Don't install devDependencies


#### `quiet`
(*Boolean*): If stdout and stderr should be printed to the terminal.


#### `symlink_node_modules`
(*Boolean*): Turn symlinking of node_modules on
        
This requires the use of Bazel 0.26.0 and the experimental
managed_directories feature.

When true, the package manager will run in the package.json folder
and the resulting node_modules folder will be symlinked into the
external repository create by this rule.

When false, the package manager will run in the external repository
created by this rule and any files other than the package.json file and
the lock file that are required for it to run should be listed in the
data attribute.


#### `timeout`
(*Integer*): Maximum duration of the command "yarn install" in seconds
            (default is 3600 seconds).


#### `use_global_yarn_cache`
(*Boolean*): Use the global yarn cache on the system.

The cache lets you avoid downloading packages multiple times.
However, it can introduce non-hermeticity, and the yarn cache can
have bugs.
Disabling this attribute causes every run of yarn to have a unique
cache_directory.


#### `yarn_lock`
(*[label], mandatory*)



## check_bazel_version

    Verify the users Bazel version is at least the given one.

This should be called from the `WORKSPACE` file so that the build fails as
early as possible. For example:

```
# in WORKSPACE:
load("@build_bazel_rules_nodejs//:defs.bzl", "check_bazel_version")
check_bazel_version("0.26.0")
```



### Usage

```
check_bazel_version(minimum_bazel_version, message)
```



#### `minimum_bazel_version`
      
a string indicating the minimum version




#### `message`
      
optional string to print to your users, could be used to help them update

Defaults to `""`





## history_server

    This is a simple Bazel wrapper around the history-server npm package.

See https://www.npmjs.com/package/history-server

A typical frontend project is served by a specific server.
This one can support the Angular router.



### Usage

```
history_server(templated_args, kwargs)
```



#### `templated_args`
      
arguments to pass to every invocation of the binary

Defaults to `[]`



#### `kwargs`
      
passed through to the underlying nodejs_binary






## http_server

    This is a simple Bazel wrapper around the http-server npm package.

See https://www.npmjs.com/package/http-server

A typical frontend project is served by a specific server.
For typical example applications, our needs are simple so we can just use http-server.
Real projects might need history-server (for router support) or even better a full-featured production server like express.

This rule uses a modified http-server to support serving Brotli-compressed files, which end with a .br extension.
This is equivalent to gzip-compression support.
See https://github.com/alexeagle/http-server/commits/master which points to a modified ecstatic library.



### Usage

```
http_server(templated_args, kwargs)
```



#### `templated_args`
      
arguments to pass to every invocation of the binary

Defaults to `[]`



#### `kwargs`
      
passed through to the underlying nodejs_binary






## node_repositories

To be run in user's WORKSPACE to install rules_nodejs dependencies.

This rule sets up node, npm, and yarn.

The versions of these tools can be specified in one of three ways:
- Normal Usage:
  Specify no explicit versions. This will download and use the latest NodeJS & Yarn that were available when the
  version of rules_nodejs you're using was released.
- Forced version(s):
  You can select the version of NodeJS and/or Yarn to download & use by specifying it when you call node_repositories,
  but you must use a value that matches a known version.
- Using a custom version:
  You can pass in a custom list of NodeJS and/or Yarn repositories and URLs for node_resositories to use.
- Using a local version:
  To avoid downloads, you can check in vendored copies of NodeJS and/or Yarn and set vendored_node and or vendored_yarn
  to point to those before calling node_repositories.

This rule exposes the `@nodejs` workspace containing some rules the user can call later:

- Run node: `bazel run @nodejs//:node path/to/program.js`
- Install dependencies using npm: `bazel run @nodejs//:npm install`
- Install dependencies using yarn: `bazel run @nodejs//:yarn`

This rule also exposes the `@yarn` workspace for backwards compatibility:

- Alternately install dependencies using yarn: `bazel run @yarn//:yarn`

Note that the dependency installation scripts will run in each subpackage indicated by the `package_json` attribute.

This approach uses npm/yarn as the package manager. You could instead have Bazel act as the package manager, running the install behind the scenes.
See the `npm_install` and `yarn_install` rules, and the discussion in the README.

Example:

```
load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories")
node_repositories(package_json = ["//:package.json", "//subpkg:package.json"])
```

Running `bazel run @nodejs//:yarn` in this repo would create `/node_modules` and `/subpkg/node_modules`.



### Usage

```
node_repositories(package_json, node_version, yarn_version, vendored_node, vendored_yarn, node_repositories, yarn_repositories, node_urls, yarn_urls, preserve_symlinks)
```



#### `package_json`
      
a list of labels, which indicate the package.json files that will be installed
              when you manually run the package manager, e.g. with
              `bazel run @nodejs//:yarn` or `bazel run @nodejs//:npm install`.
              If you use bazel-managed dependencies, you can omit this attribute.

Defaults to `[]`



#### `node_version`
      
optional; the specific version of NodeJS to install or, if
  vendored_node is specified, the vendored version of node.

Defaults to `"10.16.0"`



#### `yarn_version`
      
optional; the specific version of Yarn to install.

Defaults to `"1.13.0"`



#### `vendored_node`
      
optional; the local path to a pre-installed NodeJS runtime.
  If set then also set node_version to the version that of node that is vendored.
  Bazel will automatically turn on features such as --preserve-symlinks-main if they
  are supported by the node version being used.

Defaults to `None`



#### `vendored_yarn`
      
optional; the local path to a pre-installed yarn tool.

Defaults to `None`



#### `node_repositories`
      
optional; custom list of node repositories to use.

Defaults to `{"10.10.0-darwin_amd64": ("node-v10.10.0-darwin-x64.tar.gz", "node-v10.10.0-darwin-x64", "00b7a8426e076e9bf9d12ba2d571312e833fe962c70afafd10ad3682fdeeaa5e"), "10.10.0-linux_amd64": ("node-v10.10.0-linux-x64.tar.xz", "node-v10.10.0-linux-x64", "686d2c7b7698097e67bcd68edc3d6b5d28d81f62436c7cf9e7779d134ec262a9"), "10.10.0-windows_amd64": ("node-v10.10.0-win-x64.zip", "node-v10.10.0-win-x64", "70c46e6451798be9d052b700ce5dadccb75cf917f6bf0d6ed54344c856830cfb"), "10.13.0-darwin_amd64": ("node-v10.13.0-darwin-x64.tar.gz", "node-v10.13.0-darwin-x64", "815a5d18516934a3963ace9f0574f7d41f0c0ce9186a19be3d89e039e57598c5"), "10.13.0-linux_amd64": ("node-v10.13.0-linux-x64.tar.xz", "node-v10.13.0-linux-x64", "0dc6dba645550b66f8f00541a428c29da7c3cde32fb7eda2eb626a9db3bbf08d"), "10.13.0-windows_amd64": ("node-v10.13.0-win-x64.zip", "node-v10.13.0-win-x64", "eb09c9e9677f1919ec1ca78623c09b2a718ec5388b72b7662d5c41e5f628a52c"), "10.16.0-darwin_amd64": ("node-v10.16.0-darwin-x64.tar.gz", "node-v10.16.0-darwin-x64", "6c009df1b724026d84ae9a838c5b382662e30f6c5563a0995532f2bece39fa9c"), "10.16.0-linux_amd64": ("node-v10.16.0-linux-x64.tar.xz", "node-v10.16.0-linux-x64", "1827f5b99084740234de0c506f4dd2202a696ed60f76059696747c34339b9d48"), "10.16.0-windows_amd64": ("node-v10.16.0-win-x64.zip", "node-v10.16.0-win-x64", "aa22cb357f0fb54ccbc06b19b60e37eefea5d7dd9940912675d3ed988bf9a059"), "10.3.0-darwin_amd64": ("node-v10.3.0-darwin-x64.tar.gz", "node-v10.3.0-darwin-x64", "0bb5b7e3fe8cccda2abda958d1eb0408f1518a8b0cb58b75ade5d507cd5d6053"), "10.3.0-linux_amd64": ("node-v10.3.0-linux-x64.tar.xz", "node-v10.3.0-linux-x64", "eb3c3e2585494699716ad3197c8eedf4003d3f110829b30c5a0dc34414c47423"), "10.3.0-windows_amd64": ("node-v10.3.0-win-x64.zip", "node-v10.3.0-win-x64", "65d586afb087406a2800d8e51f664c88b26d510f077b85a3b177a1bb79f73677"), "10.9.0-darwin_amd64": ("node-v10.9.0-darwin-x64.tar.gz", "node-v10.9.0-darwin-x64", "3c4fe75dacfcc495a432a7ba2dec9045cff359af2a5d7d0429c84a424ef686fc"), "10.9.0-linux_amd64": ("node-v10.9.0-linux-x64.tar.xz", "node-v10.9.0-linux-x64", "c5acb8b7055ee0b6ac653dc4e458c5db45348cecc564b388f4ed1def84a329ff"), "10.9.0-windows_amd64": ("node-v10.9.0-win-x64.zip", "node-v10.9.0-win-x64", "6a75cdbb69d62ed242d6cbf0238a470bcbf628567ee339d4d098a5efcda2401e"), "8.11.1-darwin_amd64": ("node-v8.11.1-darwin-x64.tar.gz", "node-v8.11.1-darwin-x64", "5c7b05899ff56910a2b8180f139d48612f349ac2c5d20f08dbbeffbed9e3a089"), "8.11.1-linux_amd64": ("node-v8.11.1-linux-x64.tar.xz", "node-v8.11.1-linux-x64", "6617e245fa0f7fbe0e373e71d543fea878315324ab31dc64b4eba10e42d04c11"), "8.11.1-windows_amd64": ("node-v8.11.1-win-x64.zip", "node-v8.11.1-win-x64", "7d49b59c2b5d73a14c138e8a215d558a64a5241cd5035d9824f608e7bba097b1"), "8.12.0-darwin_amd64": ("node-v8.12.0-darwin-x64.tar.gz", "node-v8.12.0-darwin-x64", "ca131b84dfcf2b6f653a6521d31f7a108ad7d83f4d7e781945b2eca8172064aa"), "8.12.0-linux_amd64": ("node-v8.12.0-linux-x64.tar.xz", "node-v8.12.0-linux-x64", "29a20479cd1e3a03396a4e74a1784ccdd1cf2f96928b56f6ffa4c8dae40c88f2"), "8.12.0-windows_amd64": ("node-v8.12.0-win-x64.zip", "node-v8.12.0-win-x64", "9b22c9b23148b61ea0052826b3ac0255b8a3a542c125272b8f014f15bf11b091"), "8.9.1-darwin_amd64": ("node-v8.9.1-darwin-x64.tar.gz", "node-v8.9.1-darwin-x64", "05c992a6621d28d564b92bf3051a5dc0adf83839237c0d4653a8cdb8a1c73b94"), "8.9.1-linux_amd64": ("node-v8.9.1-linux-x64.tar.xz", "node-v8.9.1-linux-x64", "8be82805f7c1ab3e64d4569fb9a90ded2de78dd27cadbb91bad1bf975dae1e2d"), "8.9.1-windows_amd64": ("node-v8.9.1-win-x64.zip", "node-v8.9.1-win-x64", "db89c6e041da359561fbe7da075bb4f9881a0f7d3e98c203e83732cfb283fa4a"), "9.11.1-darwin_amd64": ("node-v9.11.1-darwin-x64.tar.gz", "node-v9.11.1-darwin-x64", "7b1fb394aa41a62b477e36df16644bd383cc9084808511f6cd318b835a06aac6"), "9.11.1-linux_amd64": ("node-v9.11.1-linux-x64.tar.xz", "node-v9.11.1-linux-x64", "4d27a95d5c2f1c8ef99118794c9c4903e63963418d3e16ca7576760cff39879b"), "9.11.1-windows_amd64": ("node-v9.11.1-win-x64.zip", "node-v9.11.1-win-x64", "0a3566d57ccb7fed95d18fc6c3bc1552a1b1e4753f9bc6c5d45e04f325e1ee53")}`



#### `yarn_repositories`
      
optional; custom list of yarn repositories to use.

Defaults to `{"1.12.1": ("yarn-v1.12.1.tar.gz", "yarn-v1.12.1", "09bea8f4ec41e9079fa03093d3b2db7ac5c5331852236d63815f8df42b3ba88d"), "1.12.3": ("yarn-v1.12.3.tar.gz", "yarn-v1.12.3", "02cd4b589ec22c4bdbd2bc5ebbfd99c5e99b07242ad68a539cb37896b93a24f2"), "1.13.0": ("yarn-v1.13.0.tar.gz", "yarn-v1.13.0", "125d40ebf621ebb08e3f66a618bd2cc5cd77fa317a312900a1ab4360ed38bf14"), "1.3.2": ("yarn-v1.3.2.tar.gz", "yarn-v1.3.2", "6cfe82e530ef0837212f13e45c1565ba53f5199eec2527b85ecbcd88bf26821d"), "1.5.1": ("yarn-v1.5.1.tar.gz", "yarn-v1.5.1", "cd31657232cf48d57fdbff55f38bfa058d2fb4950450bd34af72dac796af4de1"), "1.6.0": ("yarn-v1.6.0.tar.gz", "yarn-v1.6.0", "a57b2fdb2bfeeb083d45a883bc29af94d5e83a21c25f3fc001c295938e988509"), "1.9.2": ("yarn-v1.9.2.tar.gz", "yarn-v1.9.2", "3ad69cc7f68159a562c676e21998eb21b44138cae7e8fe0749a7d620cf940204"), "1.9.4": ("yarn-v1.9.4.tar.gz", "yarn-v1.9.4", "7667eb715077b4bad8e2a832e7084e0e6f1ba54d7280dc573c8f7031a7fb093e")}`



#### `node_urls`
      
optional; custom list of URLs to use to download NodeJS.

Defaults to `["https://mirror.bazel.build/nodejs.org/dist/v{version}/{filename}", "https://nodejs.org/dist/v{version}/{filename}"]`



#### `yarn_urls`
      
optional; custom list of URLs to use to download Yarn.

Defaults to `["https://mirror.bazel.build/github.com/yarnpkg/yarn/releases/download/v{version}/{filename}", "https://github.com/yarnpkg/yarn/releases/download/v{version}/{filename}"]`



#### `preserve_symlinks`
      
Turn on --node_options=--preserve-symlinks for nodejs_binary and nodejs_test rules.
  The default for this is currently True but the options is deprecated and will be removed in the future.
  When this option is turned on, node will preserve the symlinked path for resolves instead of the default
  behavior of resolving to the real path. This means that all required files must be in be included in your
  runfiles as it prevents the default behavior of potentially resolving outside of the runfiles. For example,
  all required files need to be included in your node_modules filegroup. This option is desirable as it gives
  a stronger guarantee of hermiticity which is required for remote execution.

Defaults to `True`





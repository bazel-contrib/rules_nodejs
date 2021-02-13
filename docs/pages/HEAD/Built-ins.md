<!-- *********************
title: Built-ins
toc: true
nav: rule
********************* -->

# Built-in rules

These rules are available without any npm installation, via the `WORKSPACE` install of the `build_bazel_rules_nodejs` workspace.
This is necessary to bootstrap Bazel to run the package manager to download other rules from NPM.


## node_repositories
To be run in user's WORKSPACE to install rules_nodejs dependencies.

This rule sets up node, npm, and yarn. The versions of these tools can be specified in one of three ways

### Simplest Usage

Specify no explicit versions. This will download and use the latest NodeJS & Yarn that were available when the
version of rules_nodejs you're using was released.
Note that you can skip calling `node_repositories` in your WORKSPACE file - if you later try to `yarn_install` or `npm_install`,
we'll automatically select this simple usage for you.

### Forced version(s)

You can select the version of NodeJS and/or Yarn to download & use by specifying it when you call node_repositories,
using a value that matches a known version (see the default values)

### Using a custom version

You can pass in a custom list of NodeJS and/or Yarn repositories and URLs for node_resositories to use.

#### Custom NodeJS versions

To specify custom NodeJS versions, use the `node_repositories` attribute

```python
node_repositories(
    node_repositories = {
        "10.10.0-darwin_amd64": ("node-v10.10.0-darwin-x64.tar.gz", "node-v10.10.0-darwin-x64", "00b7a8426e076e9bf9d12ba2d571312e833fe962c70afafd10ad3682fdeeaa5e"),
        "10.10.0-linux_amd64": ("node-v10.10.0-linux-x64.tar.xz", "node-v10.10.0-linux-x64", "686d2c7b7698097e67bcd68edc3d6b5d28d81f62436c7cf9e7779d134ec262a9"),
        "10.10.0-windows_amd64": ("node-v10.10.0-win-x64.zip", "node-v10.10.0-win-x64", "70c46e6451798be9d052b700ce5dadccb75cf917f6bf0d6ed54344c856830cfb"),
    },
)
```

These can be mapped to a custom download URL, using `node_urls`

```python
node_repositories(
    node_version = "10.10.0",
    node_repositories = {"10.10.0-darwin_amd64": ("node-v10.10.0-darwin-x64.tar.gz", "node-v10.10.0-darwin-x64", "00b7a8426e076e9bf9d12ba2d571312e833fe962c70afafd10ad3682fdeeaa5e")},
    node_urls = ["https://mycorpproxy/mirror/node/v{version}/{filename}"],
)
```

A Mac client will try to download node from `https://mycorpproxy/mirror/node/v10.10.0/node-v10.10.0-darwin-x64.tar.gz`
and expect that file to have sha256sum `00b7a8426e076e9bf9d12ba2d571312e833fe962c70afafd10ad3682fdeeaa5e`

#### Custom Yarn versions

To specify custom Yarn versions, use the `yarn_repositories` attribute

```python
node_repositories(
    yarn_repositories = {
        "1.12.1": ("yarn-v1.12.1.tar.gz", "yarn-v1.12.1", "09bea8f4ec41e9079fa03093d3b2db7ac5c5331852236d63815f8df42b3ba88d"),
    },
)
```

Like `node_urls`, the `yarn_urls` attribute can be used to provide a list of custom URLs to use to download yarn

```python
node_repositories(
    yarn_repositories = {
        "1.12.1": ("yarn-v1.12.1.tar.gz", "yarn-v1.12.1", "09bea8f4ec41e9079fa03093d3b2db7ac5c5331852236d63815f8df42b3ba88d"),
    },
    yarn_version = "1.12.1",
    yarn_urls = [
        "https://github.com/yarnpkg/yarn/releases/download/v{version}/{filename}",
    ],
)
```

Will download yarn from https://github.com/yarnpkg/yarn/releases/download/v1.2.1/yarn-v1.12.1.tar.gz
and expect the file to have sha256sum `09bea8f4ec41e9079fa03093d3b2db7ac5c5331852236d63815f8df42b3ba88d`.

### Using a local version

To avoid downloads, you can check in vendored copies of NodeJS and/or Yarn and set vendored_node and or vendored_yarn
to point to those before calling node_repositories. You can also point to a location where node is installed on your computer,
but we don't recommend this because it leads to version skew between you, your coworkers, and your Continuous Integration environment.
It also ties your build to a single platform, preventing you from cross-compiling into a Linux docker image on Mac for example.

See the [the repositories documentation](repositories.html) for how to use the resulting repositories.

### Manual install

You can optionally pass a `package_json` array to node_repositories. This lets you use Bazel's version of yarn or npm, yet always run the package manager yourself.
This is an advanced scenario you can use in place of the `npm_install` or `yarn_install` rules, but we don't recommend it, and might remove it in the future.

```
load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories")
node_repositories(package_json = ["//:package.json", "//subpkg:package.json"])
```

Running `bazel run @nodejs//:yarn_node_repositories` in this repo would create `/node_modules` and `/subpkg/node_modules`.

Note that the dependency installation scripts will run in each subpackage indicated by the `package_json` attribute.



#### Attributes


##### .attribute name (required)


###### .attribute-type Name
A unique name for this repository.


##### .attribute node_download_auth


###### .attribute-type String Dict
auth to use for all url requests
Example: {"type": "basic", "login": "<UserName>", "password": "<Password>" }



##### .attribute node_repositories


###### .attribute-type String List Dict
Custom list of node repositories to use

A dictionary mapping NodeJS versions to sets of hosts and their corresponding (filename, strip_prefix, sha256) tuples.
You should list a node binary for every platform users have, likely Mac, Windows, and Linux.

By default, if this attribute has no items, we'll use a list of all public NodeJS releases.



##### .attribute node_urls


###### .attribute-type String List
custom list of URLs to use to download NodeJS

Each entry is a template for downloading a node distribution.

The `{version}` parameter is substituted with the `node_version` attribute,
and `{filename}` with the matching entry from the `node_repositories` attribute.



##### .attribute node_version


###### .attribute-type String
the specific version of NodeJS to install or, if vendored_node is specified, the vendored version of node


##### .attribute package_json


###### .attribute-type Label List
(ADVANCED, not recommended)
            a list of labels, which indicate the package.json files that will be installed
            when you manually run the package manager, e.g. with
            `bazel run @nodejs//:yarn_node_repositories` or `bazel run @nodejs//:npm_node_repositories install`.
            If you use bazel-managed dependencies, you should omit this attribute.


##### .attribute preserve_symlinks


###### .attribute-type Boolean
Turn on --node_options=--preserve-symlinks for nodejs_binary and nodejs_test rules.

When this option is turned on, node will preserve the symlinked path for resolves instead of the default
behavior of resolving to the real path. This means that all required files must be in be included in your
runfiles as it prevents the default behavior of potentially resolving outside of the runfiles. For example,
all required files need to be included in your node_modules filegroup. This option is desirable as it gives
a stronger guarantee of hermeticity which is required for remote execution.


##### .attribute repo_mapping (required)


###### .attribute-type String Dict
A dictionary from local repository name to global repository name. This allows controls over workspace dependency resolution for dependencies of this repository.<p>For example, an entry `"@foo": "@bar"` declares that, for any time this repository depends on `@foo` (such as a dependency on `@foo//some:target`, it should actually resolve that dependency within globally-declared `@bar` (`@bar//some:target`).


##### .attribute vendored_node


###### .attribute-type Label
the local path to a pre-installed NodeJS runtime.

If set then also set node_version to the version that of node that is vendored.


##### .attribute vendored_yarn


###### .attribute-type Label
the local path to a pre-installed yarn tool


##### .attribute yarn_download_auth


###### .attribute-type String Dict
auth to use for all url requests
Example: {"type": "basic", "login": "<UserName>", "password": "<Password>" }



##### .attribute yarn_repositories


###### .attribute-type String List Dict
Custom list of yarn repositories to use.

Dictionary mapping Yarn versions to their corresponding (filename, strip_prefix, sha256) tuples.

By default, if this attribute has no items, we'll use a list of all public NodeJS releases.



##### .attribute yarn_urls


###### .attribute-type String List
custom list of URLs to use to download Yarn

Each entry is a template, similar to the `node_urls` attribute, using `yarn_version` and `yarn_repositories` in the substitutions.



##### .attribute yarn_version


###### .attribute-type String
the specific version of Yarn to install


## nodejs_binary
Runs some JavaScript code in NodeJS.


#### Attributes


##### .attribute name (required)


###### .attribute-type Name
A unique name for this target.


##### .attribute chdir


###### .attribute-type String
Working directory to run the binary or test in, relative to the workspace.
By default, Bazel always runs in the workspace root.
Due to implementation details, this argument must be underneath this package directory.

To run in the directory containing the `nodejs_binary` / `nodejs_test`, use
    
    chdir = package_name()

(or if you're in a macro, use `native.package_name()`)

WARNING: this will affect other paths passed to the program, either as arguments or in configuration files,
which are workspace-relative.
You may need `../../` segments to re-relativize such paths to the new working directory.



##### .attribute configuration_env_vars


###### .attribute-type String List
Pass these configuration environment variables to the resulting binary.
Chooses a subset of the configuration environment variables (taken from `ctx.var`), which also
includes anything specified via the --define flag.
Note, this can lead to different outputs produced by this rule.


##### .attribute data


###### .attribute-type Label List
Runtime dependencies which may be loaded during execution.


##### .attribute default_env_vars


###### .attribute-type String List
Default environment variables that are added to `configuration_env_vars`.

This is separate from the default of `configuration_env_vars` so that a user can set `configuration_env_vars`
without losing the defaults that should be set in most cases.

The set of default  environment variables is:

- `VERBOSE_LOGS`: use by some rules & tools to turn on debug output in their logs
- `NODE_DEBUG`: used by node.js itself to print more logs
- `RUNFILES_LIB_DEBUG`: print diagnostic message from Bazel runfiles.bash helper



##### .attribute entry_point (required)


###### .attribute-type Label
The script which should be executed first, usually containing a main function.

If the entry JavaScript file belongs to the same package (as the BUILD file),
you can simply reference it by its relative name to the package directory:

```python
nodejs_binary(
    name = "my_binary",
    ...
    entry_point = ":file.js",
)
```

You can specify the entry point as a typescript file so long as you also include
the ts_library target in data:

```python
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

```python
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

```python
nodejs_binary(
    name = "history-server",
    entry_point = "@npm//:node_modules/history-server/modules/cli.js",
    data = ["@npm//history-server"],
)
```



##### .attribute env


###### .attribute-type String Dict
Specifies additional environment variables to set when the target is executed, subject to location
expansion.
        


##### .attribute link_workspace_root


###### .attribute-type Boolean
Link the workspace root to the bin_dir to support absolute requires like 'my_wksp/path/to/file'.
If source files need to be required then they can be copied to the bin_dir with copy_to_bin.


##### .attribute templated_args


###### .attribute-type String List
Arguments which are passed to every execution of the program.
        To pass a node startup option, prepend it with `--node_options=`, e.g.
        `--node_options=--preserve-symlinks`.

Subject to 'Make variable' substitution. See https://docs.bazel.build/versions/master/be/make-variables.html.

1. Subject to predefined source/output path variables substitutions.

The predefined variables `execpath`, `execpaths`, `rootpath`, `rootpaths`, `location`, and `locations` take
label parameters (e.g. `$(execpath //foo:bar)`) and substitute the file paths denoted by that label.

See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_label_variables for more info.

NB: This $(location) substition returns the manifest file path which differs from the *_binary & *_test
args and genrule bazel substitions. This will be fixed in a future major release.
See docs string of `expand_location_into_runfiles` macro in `internal/common/expand_into_runfiles.bzl`
for more info.

The recommended approach is to now use `$(rootpath)` where you previously used $(location).

To get from a `$(rootpath)` to the absolute path that `$$(rlocation $(location))` returned you can either use
`$$(rlocation $(rootpath))` if you are in the `templated_args` of a `nodejs_binary` or `nodejs_test`:

BUILD.bazel:
```python
nodejs_test(
    name = "my_test",
    data = [":bootstrap.js"],
    templated_args = ["--node_options=--require=$$(rlocation $(rootpath :bootstrap.js))"],
)
```

or if you're in the context of a .js script you can pass the $(rootpath) as an argument to the script
and use the javascript runfiles helper to resolve to the absolute path:

BUILD.bazel:
```python
nodejs_test(
    name = "my_test",
    data = [":some_file"],
    entry_point = ":my_test.js",
    templated_args = ["$(rootpath :some_file)"],
)
```

my_test.js
```python
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const args = process.argv.slice(2);
const some_file = runfiles.resolveWorkspaceRelative(args[0]);
```

NB: Bazel will error if it sees the single dollar sign $(rlocation path) in `templated_args` as it will try to
expand `$(rlocation)` since we now expand predefined & custom "make" variables such as `$(COMPILATION_MODE)`,
`$(BINDIR)` & `$(TARGET_CPU)` using `ctx.expand_make_variables`. See https://docs.bazel.build/versions/master/be/make-variables.html.

To prevent expansion of `$(rlocation)` write it as `$$(rlocation)`. Bazel understands `$$` to be
the string literal `$` and the expansion results in `$(rlocation)` being passed as an arg instead
of being expanded. `$(rlocation)` is then evaluated by the bash node launcher script and it calls
the `rlocation` function in the runfiles.bash helper. For example, the templated arg
`$$(rlocation $(rootpath //:some_file))` is expanded by Bazel to `$(rlocation ./some_file)` which
is then converted in bash to the absolute path of `//:some_file` in runfiles by the runfiles.bash helper
before being passed as an argument to the program.

NB: nodejs_binary and nodejs_test will preserve the legacy behavior of `$(rlocation)` so users don't
need to update to `$$(rlocation)`. This may be changed in the future.

2. Subject to predefined variables & custom variable substitutions.

Predefined "Make" variables such as $(COMPILATION_MODE) and $(TARGET_CPU) are expanded.
See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_variables.

Custom variables are also expanded including variables set through the Bazel CLI with --define=SOME_VAR=SOME_VALUE.
See https://docs.bazel.build/versions/master/be/make-variables.html#custom_variables.

Predefined genrule variables are not supported in this context.



## nodejs_test

Identical to `nodejs_binary`, except this can be used with `bazel test` as well.
When the binary returns zero exit code, the test passes; otherwise it fails.

`nodejs_test` is a convenient way to write a novel kind of test based on running
your own test runner. For example, the `ts-api-guardian` library has a way to
assert the public API of a TypeScript program, and uses `nodejs_test` here:
https://github.com/angular/angular/blob/master/tools/ts-api-guardian/index.bzl

If you just want to run a standard test using a test runner from npm, use the generated
*_test target created by npm_install/yarn_install, such as `mocha_test`.
Some test runners like Karma and Jasmine have custom rules with added features, e.g. `jasmine_node_test`.

By default, Bazel runs tests with a working directory set to your workspace root.
Use the `chdir` attribute to change the working directory before the program starts.

To debug a Node.js test, we recommend saving a group of flags together in a "config".
Put this in your `tools/bazel.rc` so it's shared with your team:
```python
# Enable debugging tests with --config=debug
test:debug --test_arg=--node_options=--inspect-brk --test_output=streamed --test_strategy=exclusive --test_timeout=9999 --nocache_test_results
```

Now you can add `--config=debug` to any `bazel test` command line.
The runtime will pause before executing the program, allowing you to connect a
remote debugger.



#### Attributes


##### .attribute name (required)


###### .attribute-type Name
A unique name for this target.


##### .attribute chdir


###### .attribute-type String
Working directory to run the binary or test in, relative to the workspace.
By default, Bazel always runs in the workspace root.
Due to implementation details, this argument must be underneath this package directory.

To run in the directory containing the `nodejs_binary` / `nodejs_test`, use
    
    chdir = package_name()

(or if you're in a macro, use `native.package_name()`)

WARNING: this will affect other paths passed to the program, either as arguments or in configuration files,
which are workspace-relative.
You may need `../../` segments to re-relativize such paths to the new working directory.



##### .attribute configuration_env_vars


###### .attribute-type String List
Pass these configuration environment variables to the resulting binary.
Chooses a subset of the configuration environment variables (taken from `ctx.var`), which also
includes anything specified via the --define flag.
Note, this can lead to different outputs produced by this rule.


##### .attribute data


###### .attribute-type Label List
Runtime dependencies which may be loaded during execution.


##### .attribute default_env_vars


###### .attribute-type String List
Default environment variables that are added to `configuration_env_vars`.

This is separate from the default of `configuration_env_vars` so that a user can set `configuration_env_vars`
without losing the defaults that should be set in most cases.

The set of default  environment variables is:

- `VERBOSE_LOGS`: use by some rules & tools to turn on debug output in their logs
- `NODE_DEBUG`: used by node.js itself to print more logs
- `RUNFILES_LIB_DEBUG`: print diagnostic message from Bazel runfiles.bash helper



##### .attribute entry_point (required)


###### .attribute-type Label
The script which should be executed first, usually containing a main function.

If the entry JavaScript file belongs to the same package (as the BUILD file),
you can simply reference it by its relative name to the package directory:

```python
nodejs_binary(
    name = "my_binary",
    ...
    entry_point = ":file.js",
)
```

You can specify the entry point as a typescript file so long as you also include
the ts_library target in data:

```python
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

```python
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

```python
nodejs_binary(
    name = "history-server",
    entry_point = "@npm//:node_modules/history-server/modules/cli.js",
    data = ["@npm//history-server"],
)
```



##### .attribute env


###### .attribute-type String Dict
Specifies additional environment variables to set when the target is executed, subject to location
expansion.
        


##### .attribute expected_exit_code


###### .attribute-type Int
The expected exit code for the test. Defaults to 0.


##### .attribute link_workspace_root


###### .attribute-type Boolean
Link the workspace root to the bin_dir to support absolute requires like 'my_wksp/path/to/file'.
If source files need to be required then they can be copied to the bin_dir with copy_to_bin.


##### .attribute templated_args


###### .attribute-type String List
Arguments which are passed to every execution of the program.
        To pass a node startup option, prepend it with `--node_options=`, e.g.
        `--node_options=--preserve-symlinks`.

Subject to 'Make variable' substitution. See https://docs.bazel.build/versions/master/be/make-variables.html.

1. Subject to predefined source/output path variables substitutions.

The predefined variables `execpath`, `execpaths`, `rootpath`, `rootpaths`, `location`, and `locations` take
label parameters (e.g. `$(execpath //foo:bar)`) and substitute the file paths denoted by that label.

See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_label_variables for more info.

NB: This $(location) substition returns the manifest file path which differs from the *_binary & *_test
args and genrule bazel substitions. This will be fixed in a future major release.
See docs string of `expand_location_into_runfiles` macro in `internal/common/expand_into_runfiles.bzl`
for more info.

The recommended approach is to now use `$(rootpath)` where you previously used $(location).

To get from a `$(rootpath)` to the absolute path that `$$(rlocation $(location))` returned you can either use
`$$(rlocation $(rootpath))` if you are in the `templated_args` of a `nodejs_binary` or `nodejs_test`:

BUILD.bazel:
```python
nodejs_test(
    name = "my_test",
    data = [":bootstrap.js"],
    templated_args = ["--node_options=--require=$$(rlocation $(rootpath :bootstrap.js))"],
)
```

or if you're in the context of a .js script you can pass the $(rootpath) as an argument to the script
and use the javascript runfiles helper to resolve to the absolute path:

BUILD.bazel:
```python
nodejs_test(
    name = "my_test",
    data = [":some_file"],
    entry_point = ":my_test.js",
    templated_args = ["$(rootpath :some_file)"],
)
```

my_test.js
```python
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const args = process.argv.slice(2);
const some_file = runfiles.resolveWorkspaceRelative(args[0]);
```

NB: Bazel will error if it sees the single dollar sign $(rlocation path) in `templated_args` as it will try to
expand `$(rlocation)` since we now expand predefined & custom "make" variables such as `$(COMPILATION_MODE)`,
`$(BINDIR)` & `$(TARGET_CPU)` using `ctx.expand_make_variables`. See https://docs.bazel.build/versions/master/be/make-variables.html.

To prevent expansion of `$(rlocation)` write it as `$$(rlocation)`. Bazel understands `$$` to be
the string literal `$` and the expansion results in `$(rlocation)` being passed as an arg instead
of being expanded. `$(rlocation)` is then evaluated by the bash node launcher script and it calls
the `rlocation` function in the runfiles.bash helper. For example, the templated arg
`$$(rlocation $(rootpath //:some_file))` is expanded by Bazel to `$(rlocation ./some_file)` which
is then converted in bash to the absolute path of `//:some_file` in runfiles by the runfiles.bash helper
before being passed as an argument to the program.

NB: nodejs_binary and nodejs_test will preserve the legacy behavior of `$(rlocation)` so users don't
need to update to `$$(rlocation)`. This may be changed in the future.

2. Subject to predefined variables & custom variable substitutions.

Predefined "Make" variables such as $(COMPILATION_MODE) and $(TARGET_CPU) are expanded.
See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_variables.

Custom variables are also expanded including variables set through the Bazel CLI with --define=SOME_VAR=SOME_VALUE.
See https://docs.bazel.build/versions/master/be/make-variables.html#custom_variables.

Predefined genrule variables are not supported in this context.



## npm_install
Runs npm install during workspace setup.

This rule will set the environment variable `BAZEL_NPM_INSTALL` to '1' (unless it
set to another value in the environment attribute). Scripts may use to this to
check if yarn is being run by the `npm_install` repository rule.


#### Attributes


##### .attribute name (required)


###### .attribute-type Name
A unique name for this repository.


##### .attribute args


###### .attribute-type String List
Arguments passed to npm install.

See npm CLI docs https://docs.npmjs.com/cli/install.html for complete list of supported arguments.


##### .attribute data


###### .attribute-type Label List
Data files required by this rule.

If symlink_node_modules is True, this attribute is optional since the package manager
will run in your workspace folder. It is recommended, however, that all files that the
package manager depends on, such as `.rc` files or files used in `postinstall`, are added
symlink_node_modules is True so that the repository rule is rerun when any of these files
change.

If symlink_node_modules is False, the package manager is run in the bazel external
repository so all files that the package manager depends on must be listed.



##### .attribute environment


###### .attribute-type String Dict
Environment variables to set before calling the package manager.


##### .attribute generate_local_modules_build_files


###### .attribute-type Boolean
Enables the BUILD files auto generation for local modules installed with `file:` (npm) or `link:` (yarn)

When using a monorepo it's common to have modules that we want to use locally and
publish to an external package repository. This can be achieved using a `js_library` rule
with a `package_name` attribute defined inside the local package `BUILD` file. However,
if the project relies on the local package dependency with `file:` (npm) or `link:` (yarn) to be used outside Bazel, this
could introduce a race condition with both `npm_install` or `yarn_install` rules.

In order to overcome it, a link could be created to the package `BUILD` file from the
npm external Bazel repository (so we can use a local BUILD file instead of an auto generated one),
which require us to set `generate_local_modules_build_files = False` and complete a last step which is writing the
expected targets on that same `BUILD` file to be later used both by `npm_install` or `yarn_install`
rules, which are: `<package_name__files>`, `<package_name__nested_node_modules>`,
`<package_name__contents>`, `<package_name__typings>` and the last one just `<package_name>`. If you doubt what those targets
should look like, check the generated `BUILD` file for a given node module.

When true, the rule will follow the default behaviour of auto generating BUILD files for each `node_module` at install time.

When False, the rule will not auto generate BUILD files for `node_modules` that are installed as symlinks for local modules.



##### .attribute included_files


###### .attribute-type String List
List of file extensions to be included in the npm package targets.

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



##### .attribute manual_build_file_contents


###### .attribute-type String
Experimental attribute that can be used to override the generated BUILD.bazel file and set its contents manually.

Can be used to work-around a bazel performance issue if the
default `@wksp//:node_modules` target has too many files in it.
See https://github.com/bazelbuild/bazel/issues/5153. If
you are running into performance issues due to a large
node_modules target it is recommended to switch to using
fine grained npm dependencies.



##### .attribute npm_command


###### .attribute-type String
The npm command to run, to install dependencies.

            See npm docs <https://docs.npmjs.com/cli/v6/commands>

            In particular, for "ci" it says:
            > If dependencies in the package lock do not match those in package.json, npm ci will exit with an error, instead of updating the package lock.
            


##### .attribute package_json (required)


###### .attribute-type Label



##### .attribute package_lock_json (required)


###### .attribute-type Label



##### .attribute package_path


###### .attribute-type String
If set, link the 3rd party node_modules dependencies under the package path specified.

In most cases, this should be the directory of the package.json file so that the linker links the node_modules
in the same location they are found in the source tree. In a future release, this will default to the package.json
directory. This is planned for 4.0: https://github.com/bazelbuild/rules_nodejs/issues/2451


##### .attribute quiet


###### .attribute-type Boolean
If stdout and stderr should be printed to the terminal.


##### .attribute repo_mapping (required)


###### .attribute-type String Dict
A dictionary from local repository name to global repository name. This allows controls over workspace dependency resolution for dependencies of this repository.<p>For example, an entry `"@foo": "@bar"` declares that, for any time this repository depends on `@foo` (such as a dependency on `@foo//some:target`, it should actually resolve that dependency within globally-declared `@bar` (`@bar//some:target`).


##### .attribute strict_visibility


###### .attribute-type Boolean
Turn on stricter visibility for generated BUILD.bazel files

When enabled, only dependencies within the given `package.json` file are given public visibility.
All transitive dependencies are given limited visibility, enforcing that all direct dependencies are
listed in the `package.json` file.



##### .attribute symlink_node_modules


###### .attribute-type Boolean
Turn symlinking of node_modules on

This requires the use of Bazel 0.26.0 and the experimental
managed_directories feature.

When true, the package manager will run in the package.json folder
and the resulting node_modules folder will be symlinked into the
external repository create by this rule.

When false, the package manager will run in the external repository
created by this rule and any files other than the package.json file and
the lock file that are required for it to run should be listed in the
data attribute.



##### .attribute timeout


###### .attribute-type Int
Maximum duration of the package manager execution in seconds.


## pkg_npm
The pkg_npm rule creates a directory containing a publishable npm artifact.

Example:

```python
load("@build_bazel_rules_nodejs//:index.bzl", "pkg_npm")

pkg_npm(
    name = "my_package",
    srcs = ["package.json"],
    deps = [":my_typescript_lib"],
    substitutions = {"//internal/": "//"},
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

With the Bazel stamping feature, pkg_npm will replace any placeholder version in your package with the actual version control tag.
See the [stamping documentation](https://github.com/bazelbuild/rules_nodejs/blob/master/docs/index.md#stamping)

Usage:

`pkg_npm` yields four labels. Build the package directory using the default label:

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
$ bazel run @nodejs//:npm_node_repositories who
# Publishes the package
$ bazel run :my_package.publish
```

You can pass arguments to npm by escaping them from Bazel using a double-hyphen, for example:

`bazel run my_package.publish -- --tag=next`

It is also possible to use the resulting tar file file from the `.pack` as an action input via the `.tar` label.
To make use of this label, the `tgz` attribute must be set, and the generating `pkg_npm` rule must have a valid `package.json` file
as part of its sources:

```python
pkg_npm(
    name = "my_package",
    srcs = ["package.json"],
    deps = [":my_typescript_lib"],
    tgz = "my_package.tgz",
)

my_rule(
    name = "foo",
    srcs = [
        "//:my_package.tar",
    ],
)
```



#### Attributes


##### .attribute name (required)


###### .attribute-type Name
A unique name for this target.


##### .attribute deps


###### .attribute-type Label List
Other targets which produce files that should be included in the package, such as `rollup_bundle`


##### .attribute nested_packages


###### .attribute-type Label List
Other pkg_npm rules whose content is copied into this package.


##### .attribute node_context_data


###### .attribute-type Label
Provides info about the build context, such as stamping.
        
By default it reads from the bazel command line, such as the `--stamp` argument.
Use this to override values for this target, such as enabling or disabling stamping.
You can use the `node_context_data` rule in `@build_bazel_rules_nodejs//internal/node:context.bzl`
to create a NodeContextInfo.



##### .attribute package_name


###### .attribute-type String
Optional package_name that this npm package may be imported as.


##### .attribute srcs


###### .attribute-type Label List
Files inside this directory which are simply copied into the package.


##### .attribute substitutions


###### .attribute-type String Dict
Key-value pairs which are replaced in all the files while building the package.
        
You can use values from the workspace status command using curly braces, for example
`{"0.0.0-PLACEHOLDER": "{STABLE_GIT_VERSION}"}`.

See the section on stamping in the [README](stamping)



##### .attribute tgz


###### .attribute-type String
If set, will create a `.tgz` file that can be used as an input to another rule, the tar will be given the name assigned to this attribute.

        NOTE: If this attribute is set, a valid `package.json` file must be included in the sources of this target
        


##### .attribute vendor_external


###### .attribute-type String List
External workspaces whose contents should be vendored into this workspace.
        Avoids `external/foo` path segments in the resulting package.


## pkg_web
Assembles a web application from source files.


#### Attributes


##### .attribute name (required)


###### .attribute-type Name
A unique name for this target.


##### .attribute additional_root_paths


###### .attribute-type String List
Path prefixes to strip off all srcs, in addition to the current package. Longest wins.


##### .attribute node_context_data


###### .attribute-type Label
Provides info about the build context, such as stamping.
        
By default it reads from the bazel command line, such as the `--stamp` argument.
Use this to override values for this target, such as enabling or disabling stamping.
You can use the `node_context_data` rule in `@build_bazel_rules_nodejs//internal/node:context.bzl`
to create a NodeContextInfo.



##### .attribute srcs


###### .attribute-type Label List
Files which should be copied into the package


##### .attribute substitutions


###### .attribute-type String Dict
Key-value pairs which are replaced in all the files while building the package.

You can use values from the workspace status command using curly braces, for example
`{"0.0.0-PLACEHOLDER": "{STABLE_GIT_VERSION}"}`.
See the section on stamping in the README.


## yarn_install
Runs yarn install during workspace setup.

This rule will set the environment variable `BAZEL_YARN_INSTALL` to '1' (unless it
set to another value in the environment attribute). Scripts may use to this to
check if yarn is being run by the `yarn_install` repository rule.


#### Attributes


##### .attribute name (required)


###### .attribute-type Name
A unique name for this repository.


##### .attribute args


###### .attribute-type String List
Arguments passed to yarn install.

See yarn CLI docs https://yarnpkg.com/en/docs/cli/install for complete list of supported arguments.


##### .attribute data


###### .attribute-type Label List
Data files required by this rule.

If symlink_node_modules is True, this attribute is optional since the package manager
will run in your workspace folder. It is recommended, however, that all files that the
package manager depends on, such as `.rc` files or files used in `postinstall`, are added
symlink_node_modules is True so that the repository rule is rerun when any of these files
change.

If symlink_node_modules is False, the package manager is run in the bazel external
repository so all files that the package manager depends on must be listed.



##### .attribute environment


###### .attribute-type String Dict
Environment variables to set before calling the package manager.


##### .attribute frozen_lockfile


###### .attribute-type Boolean
Use the `--frozen-lockfile` flag for yarn.

Don't generate a `yarn.lock` lockfile and fail if an update is needed.

This flag enables an exact install of the version that is specified in the `yarn.lock`
file. This helps to have reproducible builds across builds.

To update a dependency or install a new one run the `yarn install` command with the
vendored yarn binary. `bazel run @nodejs//:yarn install`. You can pass the options like
`bazel run @nodejs//:yarn install -- -D <dep-name>`.



##### .attribute generate_local_modules_build_files


###### .attribute-type Boolean
Enables the BUILD files auto generation for local modules installed with `file:` (npm) or `link:` (yarn)

When using a monorepo it's common to have modules that we want to use locally and
publish to an external package repository. This can be achieved using a `js_library` rule
with a `package_name` attribute defined inside the local package `BUILD` file. However,
if the project relies on the local package dependency with `file:` (npm) or `link:` (yarn) to be used outside Bazel, this
could introduce a race condition with both `npm_install` or `yarn_install` rules.

In order to overcome it, a link could be created to the package `BUILD` file from the
npm external Bazel repository (so we can use a local BUILD file instead of an auto generated one),
which require us to set `generate_local_modules_build_files = False` and complete a last step which is writing the
expected targets on that same `BUILD` file to be later used both by `npm_install` or `yarn_install`
rules, which are: `<package_name__files>`, `<package_name__nested_node_modules>`,
`<package_name__contents>`, `<package_name__typings>` and the last one just `<package_name>`. If you doubt what those targets
should look like, check the generated `BUILD` file for a given node module.

When true, the rule will follow the default behaviour of auto generating BUILD files for each `node_module` at install time.

When False, the rule will not auto generate BUILD files for `node_modules` that are installed as symlinks for local modules.



##### .attribute included_files


###### .attribute-type String List
List of file extensions to be included in the npm package targets.

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



##### .attribute manual_build_file_contents


###### .attribute-type String
Experimental attribute that can be used to override the generated BUILD.bazel file and set its contents manually.

Can be used to work-around a bazel performance issue if the
default `@wksp//:node_modules` target has too many files in it.
See https://github.com/bazelbuild/bazel/issues/5153. If
you are running into performance issues due to a large
node_modules target it is recommended to switch to using
fine grained npm dependencies.



##### .attribute package_json (required)


###### .attribute-type Label



##### .attribute package_path


###### .attribute-type String
If set, link the 3rd party node_modules dependencies under the package path specified.

In most cases, this should be the directory of the package.json file so that the linker links the node_modules
in the same location they are found in the source tree. In a future release, this will default to the package.json
directory. This is planned for 4.0: https://github.com/bazelbuild/rules_nodejs/issues/2451


##### .attribute quiet


###### .attribute-type Boolean
If stdout and stderr should be printed to the terminal.


##### .attribute repo_mapping (required)


###### .attribute-type String Dict
A dictionary from local repository name to global repository name. This allows controls over workspace dependency resolution for dependencies of this repository.<p>For example, an entry `"@foo": "@bar"` declares that, for any time this repository depends on `@foo` (such as a dependency on `@foo//some:target`, it should actually resolve that dependency within globally-declared `@bar` (`@bar//some:target`).


##### .attribute strict_visibility


###### .attribute-type Boolean
Turn on stricter visibility for generated BUILD.bazel files

When enabled, only dependencies within the given `package.json` file are given public visibility.
All transitive dependencies are given limited visibility, enforcing that all direct dependencies are
listed in the `package.json` file.



##### .attribute symlink_node_modules


###### .attribute-type Boolean
Turn symlinking of node_modules on

This requires the use of Bazel 0.26.0 and the experimental
managed_directories feature.

When true, the package manager will run in the package.json folder
and the resulting node_modules folder will be symlinked into the
external repository create by this rule.

When false, the package manager will run in the external repository
created by this rule and any files other than the package.json file and
the lock file that are required for it to run should be listed in the
data attribute.



##### .attribute timeout


###### .attribute-type Int
Maximum duration of the package manager execution in seconds.


##### .attribute use_global_yarn_cache


###### .attribute-type Boolean
Use the global yarn cache on the system.

The cache lets you avoid downloading packages multiple times.
However, it can introduce non-hermeticity, and the yarn cache can
have bugs.

Disabling this attribute causes every run of yarn to have a unique
cache_directory.

If True, this rule will pass `--mutex network` to yarn to ensure that
the global cache can be shared by parallelized yarn_install rules.

If False, this rule will pass `--cache-folder /path/to/external/repository/__yarn_cache`
to yarn so that the local cache is contained within the external repository.



##### .attribute yarn_lock (required)


###### .attribute-type Label



## check_bazel_version
    Verify the users Bazel version is at least the given one.

This can be used in rule implementations that depend on changes in Bazel,
to warn users about a mismatch between the rule and their installed Bazel
version.

This should *not* be used in users WORKSPACE files. To locally pin your
Bazel version, just create the .bazelversion file in your workspace.



#### Attributes


##### .attribute minimum_bazel_version (required)
a string indicating the minimum version


##### .attribute message
optional string to print to your users, could be used to help them update


## copy_to_bin
Copies a source file to bazel-bin at the same workspace-relative path.

e.g. `<workspace_root>/foo/bar/a.txt -> <bazel-bin>/foo/bar/a.txt`

This is useful to populate the output folder with all files needed at runtime, even
those which aren't outputs of a Bazel rule.

This way you can run a binary in the output folder (execroot or runfiles_root)
without that program needing to rely on a runfiles helper library or be aware that
files are divided between the source tree and the output tree.



#### Attributes


##### .attribute name (required)
Name of the rule.


##### .attribute srcs (required)
A List of Labels. File(s) to to copy.


##### .attribute kwargs
further keyword arguments, e.g. `visibility`


## generated_file_test
Tests that a file generated by Bazel has identical content to a file in the workspace.

This is useful for testing, where a "snapshot" or "golden" file is checked in,
so that you can code review changes to the generated output.



#### Attributes


##### .attribute name (required)
Name of the rule.


##### .attribute generated (required)
a Label of the output file generated by another rule


##### .attribute src (required)
Label of the source file in the workspace


##### .attribute substring_search
When true, creates a test that will fail only if the golden file is not found
anywhere within the generated file. Note that the .update rule is not generated in substring mode.


##### .attribute src_dbg
if the build uses `--compilation_mode dbg` then some rules will produce different output.
In this case you can specify what the dbg version of the output should look like


##### .attribute kwargs
extra arguments passed to the underlying nodejs_test


## js_library
Groups JavaScript code so that it can be depended on like an npm package.

`js_library` is intended to be used internally within Bazel, such as between two libraries in your monorepo.
This rule doesn't perform any build steps ("actions") so it is similar to a `filegroup`.
However it provides several Bazel "Providers" for interop with other rules.

> Compare this to `pkg_npm` which just produces a directory output, and therefore can't expose individual
> files to downstream targets and causes a cascading re-build of all transitive dependencies when any file
> changes. Also `pkg_npm` is intended to publish your code for external usage outside of Bazel, like
> by publishing to npm or artifactory, while `js_library` is for internal dependencies within your repo.

`js_library` also copies any source files into the bazel-out folder.
This is the same behavior as the `copy_to_bin` rule.
By copying the complete package to the output tree, we ensure that the linker (our `npm link` equivalent)
will make your source files available in the node_modules tree where resolvers expect them.
It also means you can have relative imports between the files
rather than being forced to use Bazel's "Runfiles" semantics where any program might need a helper library
to resolve files between the logical union of the source tree and the output tree.

### Example

A typical example usage of `js_library` is to expose some sources with a package name:

```python
ts_project(
    name = "compile_ts",
    srcs = glob(["*.ts"]),
)

js_library(
    name = "my_pkg",
    # Code that depends on this target can import from "@myco/mypkg"
    package_name = "@myco/mypkg",
    # Consumers might need fields like "main" or "typings"
    srcs = ["package.json"],
    # The .js and .d.ts outputs from above will be part of the package
    deps = [":compile_ts"],
)
```

> To help work with "named AMD" modules as required by `concatjs_devserver` and other Google-style "concatjs" rules,
> `js_library` has some undocumented advanced features you can find in the source code or in our examples.
> These should not be considered a public API and aren't subject to our usual support and semver guarantees.

### Outputs

Like all Bazel rules it produces a default output by providing [DefaultInfo].
You'll get these outputs if you include this in the `srcs` of a typical rule like `filegroup`,
and these will be the printed result when you `bazel build //some:js_library_target`.
The default outputs are all of:
- [DefaultInfo] produced by targets in `deps`
- A copy of all sources (InputArtifacts from your source tree) in the bazel-out directory

When there are TypeScript typings files, `js_library` provides [DeclarationInfo](#declarationinfo)
so this target can be a dependency of a TypeScript rule. This includes any `.d.ts` files in `srcs` as well
as transitive ones from `deps`.
It will also provide [OutputGroupInfo] with a "types" field, so you can select the typings outputs with
`bazel build //some:js_library_target --output_groups=types` or with a `filegroup` rule using the
[output_group] attribute.

In order to work with the linker (similar to `npm link` for first-party monorepo deps), `js_library` provides
[LinkablePackageInfo](#linkablepackageinfo) for use with our "linker" that makes this package importable.

It also provides:
- [ExternalNpmPackageInfo](#externalnpmpackageinfo) to interop with rules that expect third-party npm packages.
- [JSModuleInfo](#jsmoduleinfo) so rules like bundlers can collect the transitive set of .js files
- [JSNamedModuleInfo](#jsnamedmoduleinfo) for rules that expect named AMD or `goog.module` format JS

[OutputGroupInfo]: https://docs.bazel.build/versions/master/skylark/lib/OutputGroupInfo.html
[DefaultInfo]: https://docs.bazel.build/versions/master/skylark/lib/DefaultInfo.html
[output_group]: https://docs.bazel.build/versions/master/be/general.html#filegroup.output_group



#### Attributes


##### .attribute name (required)
a name for the target


##### .attribute srcs
the list of files that comprise the package


##### .attribute package_name
the name it will be imported by. Should match the "name" field in the package.json file.


##### .attribute deps
other targets that provide JavaScript code


##### .attribute kwargs
used for undocumented legacy features


## npm_package_bin
Run an arbitrary npm package binary (e.g. a program under node_modules/.bin/*) under Bazel.

It must produce outputs. If you just want to run a program with `bazel run`, use the nodejs_binary rule.

This is like a genrule() except that it runs our launcher script that first
links the node_modules tree before running the program.

By default, Bazel runs actions with a working directory set to your workspace root.
Use the `chdir` attribute to change the working directory before the program runs.

This is a great candidate to wrap with a macro, as documented:
https://docs.bazel.build/versions/master/skylark/macros.html#full-example



#### Attributes


##### .attribute tool
a label for a binary to run, like `@npm//terser/bin:terser`. This is the longer form of package/package_bin.
Note that you can also refer to a binary in your local workspace.


##### .attribute package
an npm package whose binary to run, like "terser". Assumes your node_modules are installed in a workspace called "npm"


##### .attribute package_bin
the "bin" entry from `package` that should be run. By default package_bin is the same string as `package`


##### .attribute data
similar to [genrule.srcs](https://docs.bazel.build/versions/master/be/general.html#genrule.srcs)
may also include targets that produce or reference npm packages which are needed by the tool


##### .attribute env
specifies additional environment variables to set when the target is executed


##### .attribute outs
similar to [genrule.outs](https://docs.bazel.build/versions/master/be/general.html#genrule.outs)


##### .attribute args
Command-line arguments to the tool.

Subject to 'Make variable' substitution. See https://docs.bazel.build/versions/master/be/make-variables.html.

1. Predefined source/output path substitions is applied first:

See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_label_variables.

Use $(execpath) $(execpaths) to expand labels to the execroot (where Bazel runs build actions).

Use $(rootpath) $(rootpaths) to expand labels to the runfiles path that a built binary can use
to find its dependencies.

Since npm_package_bin is used primarily for build actions, in most cases you'll want to
use $(execpath) or $(execpaths) to expand locations.

Using $(location) and $(locations) expansions is not recommended as these are a synonyms
for either $(execpath) or $(rootpath) depending on the context.

2. "Make" variables are expanded second:

Predefined "Make" variables such as $(COMPILATION_MODE) and $(TARGET_CPU) are expanded.
See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_variables.

Like genrule, you may also use some syntax sugar for locations.

- `$@`: if you have only one output file, the location of the output
- `$(@D)`: The output directory. If output_dir=False and there is only one file name in outs, this expands to the directory
    containing that file. If there are multiple files, this instead expands to the package's root directory in the genfiles
    tree, even if all generated files belong to the same subdirectory! If output_dir=True then this corresponds
    to the output directory which is the $(RULEDIR)/{target_name}.
- `$(RULEDIR)`: the root output directory of the rule, corresponding with its package
    (can be used with output_dir=True or False)

See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_genrule_variables.

Custom variables are also expanded including variables set through the Bazel CLI with --define=SOME_VAR=SOME_VALUE.
See https://docs.bazel.build/versions/master/be/make-variables.html#custom_variables.


##### .attribute output_dir
set to True if you want the output to be a directory
Exactly one of `outs`, `output_dir` may be used.
If you output a directory, there can only be one output, which will be a directory named the same as the target.


##### .attribute link_workspace_root
Link the workspace root to the bin_dir to support absolute requires like 'my_wksp/path/to/file'.
If source files need to be required then they can be copied to the bin_dir with copy_to_bin.


##### .attribute chdir
Working directory to run the binary or test in, relative to the workspace.

By default, Bazel always runs in the workspace root.

To run in the directory containing the `npm_package_bin` under the source tree, use
`chdir = package_name()`
(or if you're in a macro, use `native.package_name()`).

To run in the output directory where the npm_package_bin writes outputs, use
`chdir = "$(RULEDIR)"`

WARNING: this will affect other paths passed to the program, either as arguments or in configuration files,
which are workspace-relative.
You may need `../../` segments to re-relativize such paths to the new working directory.
In a `BUILD` file you could do something like this to point to the output path:

```python
_package_segments = len(package_name().split("/"))
npm_package_bin(
    ...
    chdir = package_name(),
    # ../.. segments to re-relative paths from the chdir back to workspace
    args = ["/".join([".."] * _package_segments + ["$@"])],
)
```


##### .attribute kwargs
additional undocumented keyword args


## params_file
Generates a UTF-8 encoded params file from a list of arguments.

Handles variable substitutions for args.



#### Attributes


##### .attribute name (required)
Name of the rule.


##### .attribute out (required)
Path of the output file, relative to this package.


##### .attribute args
Arguments to concatenate into a params file.

Subject to 'Make variable' substitution. See https://docs.bazel.build/versions/master/be/make-variables.html.

1. Subject to predefined source/output path variables substitutions.

The predefined variables `execpath`, `execpaths`, `rootpath`, `rootpaths`, `location`, and `locations` take
label parameters (e.g. `$(execpath //foo:bar)`) and substitute the file paths denoted by that label.

See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_label_variables for more info.

NB: This $(location) substition returns the manifest file path which differs from the *_binary & *_test
args and genrule bazel substitions. This will be fixed in a future major release.
See docs string of `expand_location_into_runfiles` macro in `internal/common/expand_into_runfiles.bzl`
for more info.

2. Subject to predefined variables & custom variable substitutions.

Predefined "Make" variables such as $(COMPILATION_MODE) and $(TARGET_CPU) are expanded.
See https://docs.bazel.build/versions/master/be/make-variables.html#predefined_variables.

Custom variables are also expanded including variables set through the Bazel CLI with --define=SOME_VAR=SOME_VALUE.
See https://docs.bazel.build/versions/master/be/make-variables.html#custom_variables.

Predefined genrule variables are not supported in this context.


##### .attribute data
Data for $(location) expansions in args.


##### .attribute newline
Line endings to use. One of ["auto", "unix", "windows"].

"auto" for platform-determined
"unix" for LF
"windows" for CRLF


##### .attribute kwargs




## declaration_info
Constructs a DeclarationInfo including all transitive files needed to type-check from DeclarationInfo providers in a list of deps.


#### Attributes


##### .attribute declarations (required)
list of typings files


##### .attribute deps
list of labels of dependencies where we should collect their DeclarationInfo to pass transitively


## js_ecma_script_module_info
Constructs a JSEcmaScriptModuleInfo including all transitive sources from JSEcmaScriptModuleInfo providers in a list of deps.

Returns a single JSEcmaScriptModuleInfo.


#### Attributes


##### .attribute sources (required)



##### .attribute deps



## js_module_info
Constructs a JSModuleInfo including all transitive sources from JSModuleInfo providers in a list of deps.

Returns a single JSModuleInfo.


#### Attributes


##### .attribute sources (required)



##### .attribute deps



## js_named_module_info
Constructs a JSNamedModuleInfo including all transitive sources from JSNamedModuleInfo providers in a list of deps.

Returns a single JSNamedModuleInfo.


#### Attributes


##### .attribute sources (required)



##### .attribute deps



## run_node
Helper to replace ctx.actions.run

This calls node programs with a node_modules directory in place



#### Attributes


##### .attribute ctx (required)
rule context from the calling rule implementation function


##### .attribute inputs (required)
list or depset of inputs to the action


##### .attribute arguments (required)
list or ctx.actions.Args object containing arguments to pass to the executable


##### .attribute executable (required)
stringy representation of the executable this action will run, eg eg. "my_executable" rather than ctx.executable.my_executable


##### .attribute chdir
directory we should change to be the working dir


##### .attribute kwargs
all other args accepted by ctx.actions.run


## DeclarationInfo
The DeclarationInfo provider allows JS rules to communicate typing information.
TypeScript's .d.ts files are used as the interop format for describing types.
package.json files are included as well, as TypeScript needs to read the "typings" property.

Do not create DeclarationInfo instances directly, instead use the declaration_info factory function.

Note: historically this was a subset of the string-typed "typescript" provider.



#### Fields


##### .attribute declarations
A depset of typings files produced by this rule


##### .attribute transitive_declarations
A depset of typings files produced by this rule and all its transitive dependencies.
This prevents needing an aspect in rules that consume the typings, which improves performance.


##### .attribute type_blacklisted_declarations
A depset of .d.ts files that we should not use to infer JSCompiler types (via tsickle)


## ExternalNpmPackageInfo
Provides information about one or more external npm packages


#### Fields


##### .attribute direct_sources
Depset of direct source files in these external npm package(s)


##### .attribute path
The local workspace path that these external npm deps should be linked at. If empty, they will be linked at the root.


##### .attribute sources
Depset of direct & transitive source files in these external npm package(s) and transitive dependencies


##### .attribute workspace
The workspace name that these external npm package(s) are provided from


## JSEcmaScriptModuleInfo
JavaScript files (and sourcemaps) that are intended to be consumed by downstream tooling.

They should use modern syntax and ESModules.
These files should typically be named "foo.mjs"

Historical note: this was the typescript.es6_sources output


#### Fields


##### .attribute direct_sources
Depset of direct JavaScript files and sourcemaps


##### .attribute sources
Depset of direct and transitive JavaScript files and sourcemaps


## JSModuleInfo
JavaScript files and sourcemaps.


#### Fields


##### .attribute direct_sources
Depset of direct JavaScript files and sourcemaps


##### .attribute sources
Depset of direct and transitive JavaScript files and sourcemaps


## JSNamedModuleInfo
JavaScript files whose module name is self-contained.

For example named AMD/UMD or goog.module format.
These files can be efficiently served with the concatjs bundler.
These outputs should be named "foo.umd.js"
(note that renaming it from "foo.js" doesn't affect the module id)

Historical note: this was the typescript.es5_sources output.



#### Fields


##### .attribute direct_sources
Depset of direct JavaScript files and sourcemaps


##### .attribute sources
Depset of direct and transitive JavaScript files and sourcemaps


## LinkablePackageInfo
The LinkablePackageInfo provider provides information to the linker for linking pkg_npm built packages


#### Fields


##### .attribute files
Depset of files in this package (must all be contained within path)


##### .attribute package_name
The package name.

Should be the same as name field in the package's package.json.

In the future, the linker may validate that the names match the name in a package.json file.



##### .attribute path
The path to link to.

Path must be relative to execroot/wksp. It can either an output dir path such as,

`bazel-out/<platform>-<build>/bin/path/to/package` or
`bazel-out/<platform>-<build>/bin/external/external_wksp>/path/to/package`

or a source file path such as,

`path/to/package` or
`external/<external_wksp>/path/to/package`



##### .attribute _tslibrary
For internal use only


## NodeContextInfo
Provides data about the build context, like config_setting's


#### Fields


##### .attribute stamp
If stamping is enabled


## NodeRuntimeDepsInfo
Stores runtime dependencies of a nodejs_binary or nodejs_test

These are files that need to be found by the node module resolver at runtime.

Historically these files were passed using the Runfiles mechanism.
However runfiles has a big performance penalty of creating a symlink forest
with FS API calls for every file in node_modules.
It also causes there to be separate node_modules trees under each binary. This
prevents user-contributed modules passed as deps[] to a particular action from
being found by node module resolver, which expects everything in one tree.

In node, this resolution is done dynamically by assuming a node_modules
tree will exist on disk, so we assume node actions/binary/test executions will
do the same.



#### Fields


##### .attribute deps
depset of runtime dependency labels


##### .attribute pkgs
list of labels of packages that provide ExternalNpmPackageInfo


## NpmPackageInfo
Provides information about one or more external npm packages


#### Fields


##### .attribute direct_sources
Depset of direct source files in these external npm package(s)


##### .attribute path
The local workspace path that these external npm deps should be linked at. If empty, they will be linked at the root.


##### .attribute sources
Depset of direct & transitive source files in these external npm package(s) and transitive dependencies


##### .attribute workspace
The workspace name that these external npm package(s) are provided from


## node_modules_aspect


###### .attribute-type Aspect attributes: deps



#### Attributes


##### .attribute name (required)


###### .attribute-type Name
A unique name for this target.

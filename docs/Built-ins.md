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


## npm_package




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




### Usage

```
rollup_bundle(name, additional_entry_points, deps, entry_point, global_name, globals, license_banner, node_modules, srcs)
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





## check_rules_nodejs_version

    Verify that a minimum build_bazel_rules_nodejs is loaded a WORKSPACE.

This should be called from the `WORKSPACE` file so that the build fails as
early as possible. For example:

```
# in WORKSPACE:
load("@build_bazel_rules_nodejs//:package.bzl", "check_rules_nodejs_version")
check_rules_nodejs_version("0.11.2")
```



### Usage

```
check_rules_nodejs_version(minimum_version_string)
```



#### `minimum_version_string`
      
a string indicating the minimum version






## dummy_bzl_library




### Usage

```
dummy_bzl_library(name, kwargs)
```



#### `name`
      




#### `kwargs`
      






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






## jasmine_node_test

Runs tests in NodeJS using the Jasmine test runner.

To debug the test, see debugging notes in `nodejs_test`.



### Usage

```
jasmine_node_test(name, srcs, data, deps, expected_exit_code, tags, kwargs)
```



#### `name`
      
name of the resulting label




#### `srcs`
      
JavaScript source files containing Jasmine specs

Defaults to `[]`



#### `data`
      
Runtime dependencies which will be loaded while the test executes

Defaults to `[]`



#### `deps`
      
Other targets which produce JavaScript, such as ts_library

Defaults to `[]`



#### `expected_exit_code`
      
The expected exit code for the test.

Defaults to `0`



#### `tags`
      
bazel tags applied to test

Defaults to `[]`



#### `kwargs`
      
remaining arguments are passed to the test rule






## node_modules_filegroup




### Usage

```
node_modules_filegroup(packages, patterns, kwargs)
```



#### `packages`
      




#### `patterns`
      

Defaults to `[]`



#### `kwargs`
      






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





## nodejs_binary

This macro exists only to wrap the nodejs_binary as an .exe for Windows.

This is exposed in the public API at `//:defs.bzl` as `nodejs_binary`, so most
users loading `nodejs_binary` are actually executing this macro.



### Usage

```
nodejs_binary(name, data, args, visibility, tags, testonly, kwargs)
```



#### `name`
      
name of the label




#### `data`
      
runtime dependencies

Defaults to `[]`



#### `args`
      
applied to the wrapper binary

Defaults to `[]`



#### `visibility`
      
applied to the wrapper binary

Defaults to `None`



#### `tags`
      
applied to the wrapper binary

Defaults to `[]`



#### `testonly`
      
applied to nodejs_binary and wrapper binary

Defaults to `0`



#### `kwargs`
      
passed to the nodejs_binary






## nodejs_test

This macro exists only to wrap the nodejs_test as an .exe for Windows.

This is exposed in the public API at `//:defs.bzl` as `nodejs_test`, so most
users loading `nodejs_test` are actually executing this macro.



### Usage

```
nodejs_test(name, data, args, visibility, tags, kwargs)
```



#### `name`
      
name of the label




#### `data`
      
runtime dependencies

Defaults to `[]`



#### `args`
      
applied to the wrapper binary

Defaults to `[]`



#### `visibility`
      
applied to the wrapper binary

Defaults to `None`



#### `tags`
      
applied to the wrapper binary

Defaults to `[]`



#### `kwargs`
      
passed to the nodejs_test






## npm_install




### Usage

```
npm_install(kwargs)
```



#### `kwargs`
      






## yarn_install




### Usage

```
yarn_install(kwargs)
```



#### `kwargs`
      






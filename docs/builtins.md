<!-- Generated with Stardoc: http://skydoc.bazel.build -->

<a name="#npm_package"></a>

## npm_package

<pre>
npm_package(<a href="#npm_package-name">name</a>, <a href="#npm_package-deps">deps</a>, <a href="#npm_package-packages">packages</a>, <a href="#npm_package-rename_build_files">rename_build_files</a>, <a href="#npm_package-replace_with_version">replace_with_version</a>, <a href="#npm_package-replacements">replacements</a>, <a href="#npm_package-srcs">srcs</a>, <a href="#npm_package-vendor_external">vendor_external</a>)
</pre>



### Attributes

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="npm_package-name">
      <td><code>name</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#name">Name</a>; required
        <p>
          A unique name for this target.
        </p>
      </td>
    </tr>
    <tr id="npm_package-deps">
      <td><code>deps</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#labels">List of labels</a>; optional
        <p>
          Other targets which produce files that should be included in the package, such as `rollup_bundle`
        </p>
      </td>
    </tr>
    <tr id="npm_package-packages">
      <td><code>packages</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#labels">List of labels</a>; optional
        <p>
          Other npm_package rules whose content is copied into this package.
        </p>
      </td>
    </tr>
    <tr id="npm_package-rename_build_files">
      <td><code>rename_build_files</code></td>
      <td>
        Boolean; optional
        <p>
          If set BUILD and BUILD.bazel files are prefixed with `_` in the npm package.
        The default is True since npm packages that contain BUILD files don't work with
        `yarn_install` and `npm_install` without a post-install step that deletes or renames them.
        </p>
      </td>
    </tr>
    <tr id="npm_package-replace_with_version">
      <td><code>replace_with_version</code></td>
      <td>
        String; optional
        <p>
          If set this value is replaced with the version stamp data.
        See the section on stamping in the README.
        </p>
      </td>
    </tr>
    <tr id="npm_package-replacements">
      <td><code>replacements</code></td>
      <td>
        <a href="https://bazel.build/docs/skylark/lib/dict.html">Dictionary: String -> String</a>; optional
        <p>
          Key-value pairs which are replaced in all the files while building the package.
        </p>
      </td>
    </tr>
    <tr id="npm_package-srcs">
      <td><code>srcs</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#labels">List of labels</a>; optional
        <p>
          Files inside this directory which are simply copied into the package.
        </p>
      </td>
    </tr>
    <tr id="npm_package-vendor_external">
      <td><code>vendor_external</code></td>
      <td>
        List of strings; optional
        <p>
          External workspaces whose contents should be vendored into this workspace.
        Avoids 'external/foo' path segments in the resulting package.
        </p>
      </td>
    </tr>
  </tbody>
</table>


<a name="#rollup_bundle"></a>

## rollup_bundle

<pre>
rollup_bundle(<a href="#rollup_bundle-name">name</a>, <a href="#rollup_bundle-additional_entry_points">additional_entry_points</a>, <a href="#rollup_bundle-deps">deps</a>, <a href="#rollup_bundle-entry_point">entry_point</a>, <a href="#rollup_bundle-global_name">global_name</a>, <a href="#rollup_bundle-globals">globals</a>, <a href="#rollup_bundle-license_banner">license_banner</a>, <a href="#rollup_bundle-node_modules">node_modules</a>, <a href="#rollup_bundle-srcs">srcs</a>)
</pre>



### Attributes

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="rollup_bundle-name">
      <td><code>name</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#name">Name</a>; required
        <p>
          A unique name for this target.
        </p>
      </td>
    </tr>
    <tr id="rollup_bundle-additional_entry_points">
      <td><code>additional_entry_points</code></td>
      <td>
        List of strings; optional
        <p>
          Additional entry points of the application for code splitting, passed as the input to rollup.
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
        </p>
      </td>
    </tr>
    <tr id="rollup_bundle-deps">
      <td><code>deps</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#labels">List of labels</a>; optional
        <p>
          Other rules that produce JavaScript outputs, such as `ts_library`.
        </p>
      </td>
    </tr>
    <tr id="rollup_bundle-entry_point">
      <td><code>entry_point</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#labels">Label</a>; required
        <p>
          The starting point of the application, passed as the `--input` flag to rollup.

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
        </p>
      </td>
    </tr>
    <tr id="rollup_bundle-global_name">
      <td><code>global_name</code></td>
      <td>
        String; optional
        <p>
          A name given to this package when referenced as a global variable.
This name appears in the bundle module incantation at the beginning of the file,
and governs the global symbol added to the global context (e.g. `window`) as a side-
effect of loading the UMD/IIFE JS bundle.

Rollup doc: "The variable name, representing your iife/umd bundle, by which other scripts on the same page can access it."

This is passed to the `output.name` setting in Rollup.
        </p>
      </td>
    </tr>
    <tr id="rollup_bundle-globals">
      <td><code>globals</code></td>
      <td>
        <a href="https://bazel.build/docs/skylark/lib/dict.html">Dictionary: String -> String</a>; optional
        <p>
          A dict of symbols that reference external scripts.
The keys are variable names that appear in the program,
and the values are the symbol to reference at runtime in a global context (UMD bundles).
For example, a program referencing @angular/core should use ng.core
as the global reference, so Angular users should include the mapping
`"@angular/core":"ng.core"` in the globals.
        </p>
      </td>
    </tr>
    <tr id="rollup_bundle-license_banner">
      <td><code>license_banner</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#labels">Label</a>; optional
        <p>
          A .txt file passed to the `banner` config option of rollup.
        The contents of the file will be copied to the top of the resulting bundles.
        Note that you can replace a version placeholder in the license file, by using
        the special version `0.0.0-PLACEHOLDER`. See the section on stamping in the README.
        </p>
      </td>
    </tr>
    <tr id="rollup_bundle-node_modules">
      <td><code>node_modules</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#labels">Label</a>; optional
        <p>
          Dependencies from npm that provide some modules that must be resolved by rollup.

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
        </p>
      </td>
    </tr>
    <tr id="rollup_bundle-srcs">
      <td><code>srcs</code></td>
      <td>
        <a href="https://bazel.build/docs/build-ref.html#labels">List of labels</a>; optional
        <p>
          JavaScript source files from the workspace.
        These can use ES2015 syntax and ES Modules (import/export)
        </p>
      </td>
    </tr>
  </tbody>
</table>


<a name="#check_bazel_version"></a>

## check_bazel_version

<pre>
check_bazel_version(<a href="#check_bazel_version-minimum_bazel_version">minimum_bazel_version</a>, <a href="#check_bazel_version-message">message</a>)
</pre>

    Verify the users Bazel version is at least the given one.

This should be called from the `WORKSPACE` file so that the build fails as
early as possible. For example:

```
# in WORKSPACE:
load("@build_bazel_rules_nodejs//:defs.bzl", "check_bazel_version")
check_bazel_version("0.26.0")
```


### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="check_bazel_version-minimum_bazel_version">
      <td><code>minimum_bazel_version</code></td>
      <td>
        required.
        <p>
          a string indicating the minimum version
        </p>
      </td>
    </tr>
    <tr id="check_bazel_version-message">
      <td><code>message</code></td>
      <td>
        optional. default is <code>""</code>
        <p>
          optional string to print to your users, could be used to help them update
        </p>
      </td>
    </tr>
  </tbody>
</table>


<a name="#check_rules_nodejs_version"></a>

## check_rules_nodejs_version

<pre>
check_rules_nodejs_version(<a href="#check_rules_nodejs_version-minimum_version_string">minimum_version_string</a>)
</pre>

    Verify that a minimum build_bazel_rules_nodejs is loaded a WORKSPACE.

This should be called from the `WORKSPACE` file so that the build fails as
early as possible. For example:

```
# in WORKSPACE:
load("@build_bazel_rules_nodejs//:package.bzl", "check_rules_nodejs_version")
check_rules_nodejs_version("0.11.2")
```


### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="check_rules_nodejs_version-minimum_version_string">
      <td><code>minimum_version_string</code></td>
      <td>
        required.
        <p>
          a string indicating the minimum version
        </p>
      </td>
    </tr>
  </tbody>
</table>


<a name="#dummy_bzl_library"></a>

## dummy_bzl_library

<pre>
dummy_bzl_library(<a href="#dummy_bzl_library-name">name</a>, <a href="#dummy_bzl_library-kwargs">kwargs</a>)
</pre>



### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="dummy_bzl_library-name">
      <td><code>name</code></td>
      <td>
        required.
      </td>
    </tr>
    <tr id="dummy_bzl_library-kwargs">
      <td><code>kwargs</code></td>
      <td>
        optional.
      </td>
    </tr>
  </tbody>
</table>


<a name="#history_server"></a>

## history_server

<pre>
history_server(<a href="#history_server-templated_args">templated_args</a>, <a href="#history_server-kwargs">kwargs</a>)
</pre>

    This is a simple Bazel wrapper around the history-server npm package.

See https://www.npmjs.com/package/history-server

A typical frontend project is served by a specific server.
This one can support the Angular router.


### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="history_server-templated_args">
      <td><code>templated_args</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          arguments to pass to every invocation of the binary
        </p>
      </td>
    </tr>
    <tr id="history_server-kwargs">
      <td><code>kwargs</code></td>
      <td>
        optional.
        <p>
          passed through to the underlying nodejs_binary
        </p>
      </td>
    </tr>
  </tbody>
</table>


<a name="#http_server"></a>

## http_server

<pre>
http_server(<a href="#http_server-templated_args">templated_args</a>, <a href="#http_server-kwargs">kwargs</a>)
</pre>

    This is a simple Bazel wrapper around the http-server npm package.

See https://www.npmjs.com/package/http-server

A typical frontend project is served by a specific server.
For typical example applications, our needs are simple so we can just use http-server.
Real projects might need history-server (for router support) or even better a full-featured production server like express.

This rule uses a modified http-server to support serving Brotli-compressed files, which end with a .br extension.
This is equivalent to gzip-compression support.
See https://github.com/alexeagle/http-server/commits/master which points to a modified ecstatic library.


### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="http_server-templated_args">
      <td><code>templated_args</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          arguments to pass to every invocation of the binary
        </p>
      </td>
    </tr>
    <tr id="http_server-kwargs">
      <td><code>kwargs</code></td>
      <td>
        optional.
        <p>
          passed through to the underlying nodejs_binary
        </p>
      </td>
    </tr>
  </tbody>
</table>


<a name="#jasmine_node_test"></a>

## jasmine_node_test

<pre>
jasmine_node_test(<a href="#jasmine_node_test-name">name</a>, <a href="#jasmine_node_test-srcs">srcs</a>, <a href="#jasmine_node_test-data">data</a>, <a href="#jasmine_node_test-deps">deps</a>, <a href="#jasmine_node_test-expected_exit_code">expected_exit_code</a>, <a href="#jasmine_node_test-tags">tags</a>, <a href="#jasmine_node_test-kwargs">kwargs</a>)
</pre>

Runs tests in NodeJS using the Jasmine test runner.

To debug the test, see debugging notes in `nodejs_test`.


### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="jasmine_node_test-name">
      <td><code>name</code></td>
      <td>
        required.
        <p>
          name of the resulting label
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-srcs">
      <td><code>srcs</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          JavaScript source files containing Jasmine specs
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-data">
      <td><code>data</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Runtime dependencies which will be loaded while the test executes
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-deps">
      <td><code>deps</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          Other targets which produce JavaScript, such as ts_library
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-expected_exit_code">
      <td><code>expected_exit_code</code></td>
      <td>
        optional. default is <code>0</code>
        <p>
          The expected exit code for the test. Defaults to 0.
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-tags">
      <td><code>tags</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          bazel tags applied to test
        </p>
      </td>
    </tr>
    <tr id="jasmine_node_test-kwargs">
      <td><code>kwargs</code></td>
      <td>
        optional.
        <p>
          remaining arguments are passed to the test rule
        </p>
      </td>
    </tr>
  </tbody>
</table>


<a name="#node_modules_filegroup"></a>

## node_modules_filegroup

<pre>
node_modules_filegroup(<a href="#node_modules_filegroup-packages">packages</a>, <a href="#node_modules_filegroup-patterns">patterns</a>, <a href="#node_modules_filegroup-kwargs">kwargs</a>)
</pre>



### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="node_modules_filegroup-packages">
      <td><code>packages</code></td>
      <td>
        required.
      </td>
    </tr>
    <tr id="node_modules_filegroup-patterns">
      <td><code>patterns</code></td>
      <td>
        optional. default is <code>[]</code>
      </td>
    </tr>
    <tr id="node_modules_filegroup-kwargs">
      <td><code>kwargs</code></td>
      <td>
        optional.
      </td>
    </tr>
  </tbody>
</table>


<a name="#node_repositories"></a>

## node_repositories

<pre>
node_repositories(<a href="#node_repositories-package_json">package_json</a>, <a href="#node_repositories-node_version">node_version</a>, <a href="#node_repositories-yarn_version">yarn_version</a>, <a href="#node_repositories-vendored_node">vendored_node</a>, <a href="#node_repositories-vendored_yarn">vendored_yarn</a>, <a href="#node_repositories-node_repositories">node_repositories</a>, <a href="#node_repositories-yarn_repositories">yarn_repositories</a>, <a href="#node_repositories-node_urls">node_urls</a>, <a href="#node_repositories-yarn_urls">yarn_urls</a>, <a href="#node_repositories-preserve_symlinks">preserve_symlinks</a>)
</pre>

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


### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="node_repositories-package_json">
      <td><code>package_json</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          a list of labels, which indicate the package.json files that will be installed
              when you manually run the package manager, e.g. with
              `bazel run @nodejs//:yarn` or `bazel run @nodejs//:npm install`.
              If you use bazel-managed dependencies, you can omit this attribute.
        </p>
      </td>
    </tr>
    <tr id="node_repositories-node_version">
      <td><code>node_version</code></td>
      <td>
        optional. default is <code>"10.16.0"</code>
        <p>
          optional; the specific version of NodeJS to install or, if
  vendored_node is specified, the vendored version of node.
        </p>
      </td>
    </tr>
    <tr id="node_repositories-yarn_version">
      <td><code>yarn_version</code></td>
      <td>
        optional. default is <code>"1.13.0"</code>
        <p>
          optional; the specific version of Yarn to install.
        </p>
      </td>
    </tr>
    <tr id="node_repositories-vendored_node">
      <td><code>vendored_node</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          optional; the local path to a pre-installed NodeJS runtime.
  If set then also set node_version to the version that of node that is vendored.
  Bazel will automatically turn on features such as --preserve-symlinks-main if they
  are supported by the node version being used.
        </p>
      </td>
    </tr>
    <tr id="node_repositories-vendored_yarn">
      <td><code>vendored_yarn</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          optional; the local path to a pre-installed yarn tool.
        </p>
      </td>
    </tr>
    <tr id="node_repositories-node_repositories">
      <td><code>node_repositories</code></td>
      <td>
        optional. default is <code>{"10.10.0-darwin_amd64": ("node-v10.10.0-darwin-x64.tar.gz", "node-v10.10.0-darwin-x64", "00b7a8426e076e9bf9d12ba2d571312e833fe962c70afafd10ad3682fdeeaa5e"), "10.10.0-linux_amd64": ("node-v10.10.0-linux-x64.tar.xz", "node-v10.10.0-linux-x64", "686d2c7b7698097e67bcd68edc3d6b5d28d81f62436c7cf9e7779d134ec262a9"), "10.10.0-windows_amd64": ("node-v10.10.0-win-x64.zip", "node-v10.10.0-win-x64", "70c46e6451798be9d052b700ce5dadccb75cf917f6bf0d6ed54344c856830cfb"), "10.13.0-darwin_amd64": ("node-v10.13.0-darwin-x64.tar.gz", "node-v10.13.0-darwin-x64", "815a5d18516934a3963ace9f0574f7d41f0c0ce9186a19be3d89e039e57598c5"), "10.13.0-linux_amd64": ("node-v10.13.0-linux-x64.tar.xz", "node-v10.13.0-linux-x64", "0dc6dba645550b66f8f00541a428c29da7c3cde32fb7eda2eb626a9db3bbf08d"), "10.13.0-windows_amd64": ("node-v10.13.0-win-x64.zip", "node-v10.13.0-win-x64", "eb09c9e9677f1919ec1ca78623c09b2a718ec5388b72b7662d5c41e5f628a52c"), "10.16.0-darwin_amd64": ("node-v10.16.0-darwin-x64.tar.gz", "node-v10.16.0-darwin-x64", "6c009df1b724026d84ae9a838c5b382662e30f6c5563a0995532f2bece39fa9c"), "10.16.0-linux_amd64": ("node-v10.16.0-linux-x64.tar.xz", "node-v10.16.0-linux-x64", "1827f5b99084740234de0c506f4dd2202a696ed60f76059696747c34339b9d48"), "10.16.0-windows_amd64": ("node-v10.16.0-win-x64.zip", "node-v10.16.0-win-x64", "aa22cb357f0fb54ccbc06b19b60e37eefea5d7dd9940912675d3ed988bf9a059"), "10.3.0-darwin_amd64": ("node-v10.3.0-darwin-x64.tar.gz", "node-v10.3.0-darwin-x64", "0bb5b7e3fe8cccda2abda958d1eb0408f1518a8b0cb58b75ade5d507cd5d6053"), "10.3.0-linux_amd64": ("node-v10.3.0-linux-x64.tar.xz", "node-v10.3.0-linux-x64", "eb3c3e2585494699716ad3197c8eedf4003d3f110829b30c5a0dc34414c47423"), "10.3.0-windows_amd64": ("node-v10.3.0-win-x64.zip", "node-v10.3.0-win-x64", "65d586afb087406a2800d8e51f664c88b26d510f077b85a3b177a1bb79f73677"), "10.9.0-darwin_amd64": ("node-v10.9.0-darwin-x64.tar.gz", "node-v10.9.0-darwin-x64", "3c4fe75dacfcc495a432a7ba2dec9045cff359af2a5d7d0429c84a424ef686fc"), "10.9.0-linux_amd64": ("node-v10.9.0-linux-x64.tar.xz", "node-v10.9.0-linux-x64", "c5acb8b7055ee0b6ac653dc4e458c5db45348cecc564b388f4ed1def84a329ff"), "10.9.0-windows_amd64": ("node-v10.9.0-win-x64.zip", "node-v10.9.0-win-x64", "6a75cdbb69d62ed242d6cbf0238a470bcbf628567ee339d4d098a5efcda2401e"), "8.11.1-darwin_amd64": ("node-v8.11.1-darwin-x64.tar.gz", "node-v8.11.1-darwin-x64", "5c7b05899ff56910a2b8180f139d48612f349ac2c5d20f08dbbeffbed9e3a089"), "8.11.1-linux_amd64": ("node-v8.11.1-linux-x64.tar.xz", "node-v8.11.1-linux-x64", "6617e245fa0f7fbe0e373e71d543fea878315324ab31dc64b4eba10e42d04c11"), "8.11.1-windows_amd64": ("node-v8.11.1-win-x64.zip", "node-v8.11.1-win-x64", "7d49b59c2b5d73a14c138e8a215d558a64a5241cd5035d9824f608e7bba097b1"), "8.12.0-darwin_amd64": ("node-v8.12.0-darwin-x64.tar.gz", "node-v8.12.0-darwin-x64", "ca131b84dfcf2b6f653a6521d31f7a108ad7d83f4d7e781945b2eca8172064aa"), "8.12.0-linux_amd64": ("node-v8.12.0-linux-x64.tar.xz", "node-v8.12.0-linux-x64", "29a20479cd1e3a03396a4e74a1784ccdd1cf2f96928b56f6ffa4c8dae40c88f2"), "8.12.0-windows_amd64": ("node-v8.12.0-win-x64.zip", "node-v8.12.0-win-x64", "9b22c9b23148b61ea0052826b3ac0255b8a3a542c125272b8f014f15bf11b091"), "8.9.1-darwin_amd64": ("node-v8.9.1-darwin-x64.tar.gz", "node-v8.9.1-darwin-x64", "05c992a6621d28d564b92bf3051a5dc0adf83839237c0d4653a8cdb8a1c73b94"), "8.9.1-linux_amd64": ("node-v8.9.1-linux-x64.tar.xz", "node-v8.9.1-linux-x64", "8be82805f7c1ab3e64d4569fb9a90ded2de78dd27cadbb91bad1bf975dae1e2d"), "8.9.1-windows_amd64": ("node-v8.9.1-win-x64.zip", "node-v8.9.1-win-x64", "db89c6e041da359561fbe7da075bb4f9881a0f7d3e98c203e83732cfb283fa4a"), "9.11.1-darwin_amd64": ("node-v9.11.1-darwin-x64.tar.gz", "node-v9.11.1-darwin-x64", "7b1fb394aa41a62b477e36df16644bd383cc9084808511f6cd318b835a06aac6"), "9.11.1-linux_amd64": ("node-v9.11.1-linux-x64.tar.xz", "node-v9.11.1-linux-x64", "4d27a95d5c2f1c8ef99118794c9c4903e63963418d3e16ca7576760cff39879b"), "9.11.1-windows_amd64": ("node-v9.11.1-win-x64.zip", "node-v9.11.1-win-x64", "0a3566d57ccb7fed95d18fc6c3bc1552a1b1e4753f9bc6c5d45e04f325e1ee53")}</code>
        <p>
          optional; custom list of node repositories to use.
        </p>
      </td>
    </tr>
    <tr id="node_repositories-yarn_repositories">
      <td><code>yarn_repositories</code></td>
      <td>
        optional. default is <code>{"1.12.1": ("yarn-v1.12.1.tar.gz", "yarn-v1.12.1", "09bea8f4ec41e9079fa03093d3b2db7ac5c5331852236d63815f8df42b3ba88d"), "1.12.3": ("yarn-v1.12.3.tar.gz", "yarn-v1.12.3", "02cd4b589ec22c4bdbd2bc5ebbfd99c5e99b07242ad68a539cb37896b93a24f2"), "1.13.0": ("yarn-v1.13.0.tar.gz", "yarn-v1.13.0", "125d40ebf621ebb08e3f66a618bd2cc5cd77fa317a312900a1ab4360ed38bf14"), "1.3.2": ("yarn-v1.3.2.tar.gz", "yarn-v1.3.2", "6cfe82e530ef0837212f13e45c1565ba53f5199eec2527b85ecbcd88bf26821d"), "1.5.1": ("yarn-v1.5.1.tar.gz", "yarn-v1.5.1", "cd31657232cf48d57fdbff55f38bfa058d2fb4950450bd34af72dac796af4de1"), "1.6.0": ("yarn-v1.6.0.tar.gz", "yarn-v1.6.0", "a57b2fdb2bfeeb083d45a883bc29af94d5e83a21c25f3fc001c295938e988509"), "1.9.2": ("yarn-v1.9.2.tar.gz", "yarn-v1.9.2", "3ad69cc7f68159a562c676e21998eb21b44138cae7e8fe0749a7d620cf940204"), "1.9.4": ("yarn-v1.9.4.tar.gz", "yarn-v1.9.4", "7667eb715077b4bad8e2a832e7084e0e6f1ba54d7280dc573c8f7031a7fb093e")}</code>
        <p>
          optional; custom list of yarn repositories to use.
        </p>
      </td>
    </tr>
    <tr id="node_repositories-node_urls">
      <td><code>node_urls</code></td>
      <td>
        optional. default is <code>["https://mirror.bazel.build/nodejs.org/dist/v{version}/{filename}", "https://nodejs.org/dist/v{version}/{filename}"]</code>
        <p>
          optional; custom list of URLs to use to download NodeJS.
        </p>
      </td>
    </tr>
    <tr id="node_repositories-yarn_urls">
      <td><code>yarn_urls</code></td>
      <td>
        optional. default is <code>["https://mirror.bazel.build/github.com/yarnpkg/yarn/releases/download/v{version}/{filename}", "https://github.com/yarnpkg/yarn/releases/download/v{version}/{filename}"]</code>
        <p>
          optional; custom list of URLs to use to download Yarn.
        </p>
      </td>
    </tr>
    <tr id="node_repositories-preserve_symlinks">
      <td><code>preserve_symlinks</code></td>
      <td>
        optional. default is <code>True</code>
        <p>
          Turn on --node_options=--preserve-symlinks for nodejs_binary and nodejs_test rules.
  The default for this is currently True but the options is deprecated and will be removed in the future.
  When this option is turned on, node will preserve the symlinked path for resolves instead of the default
  behavior of resolving to the real path. This means that all required files must be in be included in your
  runfiles as it prevents the default behavior of potentially resolving outside of the runfiles. For example,
  all required files need to be included in your node_modules filegroup. This option is desirable as it gives
  a stronger guarantee of hermiticity which is required for remote execution.
        </p>
      </td>
    </tr>
  </tbody>
</table>


<a name="#nodejs_binary"></a>

## nodejs_binary

<pre>
nodejs_binary(<a href="#nodejs_binary-name">name</a>, <a href="#nodejs_binary-data">data</a>, <a href="#nodejs_binary-args">args</a>, <a href="#nodejs_binary-visibility">visibility</a>, <a href="#nodejs_binary-tags">tags</a>, <a href="#nodejs_binary-testonly">testonly</a>, <a href="#nodejs_binary-kwargs">kwargs</a>)
</pre>

This macro exists only to wrap the nodejs_binary as an .exe for Windows.

This is exposed in the public API at `//:defs.bzl` as `nodejs_binary`, so most
users loading `nodejs_binary` are actually executing this macro.


### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="nodejs_binary-name">
      <td><code>name</code></td>
      <td>
        required.
        <p>
          name of the label
        </p>
      </td>
    </tr>
    <tr id="nodejs_binary-data">
      <td><code>data</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          runtime dependencies
        </p>
      </td>
    </tr>
    <tr id="nodejs_binary-args">
      <td><code>args</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          applied to the wrapper binary
        </p>
      </td>
    </tr>
    <tr id="nodejs_binary-visibility">
      <td><code>visibility</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          applied to the wrapper binary
        </p>
      </td>
    </tr>
    <tr id="nodejs_binary-tags">
      <td><code>tags</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          applied to the wrapper binary
        </p>
      </td>
    </tr>
    <tr id="nodejs_binary-testonly">
      <td><code>testonly</code></td>
      <td>
        optional. default is <code>0</code>
        <p>
          applied to nodejs_binary and wrapper binary
        </p>
      </td>
    </tr>
    <tr id="nodejs_binary-kwargs">
      <td><code>kwargs</code></td>
      <td>
        optional.
        <p>
          passed to the nodejs_binary
        </p>
      </td>
    </tr>
  </tbody>
</table>


<a name="#nodejs_test"></a>

## nodejs_test

<pre>
nodejs_test(<a href="#nodejs_test-name">name</a>, <a href="#nodejs_test-data">data</a>, <a href="#nodejs_test-args">args</a>, <a href="#nodejs_test-visibility">visibility</a>, <a href="#nodejs_test-tags">tags</a>, <a href="#nodejs_test-kwargs">kwargs</a>)
</pre>

This macro exists only to wrap the nodejs_test as an .exe for Windows.

This is exposed in the public API at `//:defs.bzl` as `nodejs_test`, so most
users loading `nodejs_test` are actually executing this macro.


### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="nodejs_test-name">
      <td><code>name</code></td>
      <td>
        required.
        <p>
          name of the label
        </p>
      </td>
    </tr>
    <tr id="nodejs_test-data">
      <td><code>data</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          runtime dependencies
        </p>
      </td>
    </tr>
    <tr id="nodejs_test-args">
      <td><code>args</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          applied to the wrapper binary
        </p>
      </td>
    </tr>
    <tr id="nodejs_test-visibility">
      <td><code>visibility</code></td>
      <td>
        optional. default is <code>None</code>
        <p>
          applied to the wrapper binary
        </p>
      </td>
    </tr>
    <tr id="nodejs_test-tags">
      <td><code>tags</code></td>
      <td>
        optional. default is <code>[]</code>
        <p>
          applied to the wrapper binary
        </p>
      </td>
    </tr>
    <tr id="nodejs_test-kwargs">
      <td><code>kwargs</code></td>
      <td>
        optional.
        <p>
          passed to the nodejs_test
        </p>
      </td>
    </tr>
  </tbody>
</table>


<a name="#npm_install"></a>

## npm_install

<pre>
npm_install(<a href="#npm_install-kwargs">kwargs</a>)
</pre>



### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="npm_install-kwargs">
      <td><code>kwargs</code></td>
      <td>
        optional.
      </td>
    </tr>
  </tbody>
</table>


<a name="#yarn_install"></a>

## yarn_install

<pre>
yarn_install(<a href="#yarn_install-kwargs">kwargs</a>)
</pre>



### Parameters

<table class="params-table">
  <colgroup>
    <col class="col-param" />
    <col class="col-description" />
  </colgroup>
  <tbody>
    <tr id="yarn_install-kwargs">
      <td><code>kwargs</code></td>
      <td>
        optional.
      </td>
    </tr>
  </tbody>
</table>



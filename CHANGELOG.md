# [1.0.0](https://github.com/bazelbuild/rules_nodejs/compare/0.42.3...1.0.0) (2019-12-20)


### Bug Fixes

* **builtin:** bin folder was included in runfiles path for tests when link type was 'bin' ([f938ab7](https://github.com/bazelbuild/rules_nodejs/commit/f938ab7))
* **builtin:** link module_name to directories recursively to avoid directory clashes ([#1432](https://github.com/bazelbuild/rules_nodejs/issues/1432)) ([0217724](https://github.com/bazelbuild/rules_nodejs/commit/0217724)), closes [#1411](https://github.com/bazelbuild/rules_nodejs/issues/1411)
* **builtin:** strip BOM when parsing package.json ([#1453](https://github.com/bazelbuild/rules_nodejs/issues/1453)) ([c65d9b7](https://github.com/bazelbuild/rules_nodejs/commit/c65d9b7)), closes [#1448](https://github.com/bazelbuild/rules_nodejs/issues/1448)
* **typescript:** remove stray references to ts_auto_deps ([#1449](https://github.com/bazelbuild/rules_nodejs/issues/1449)) ([aacd924](https://github.com/bazelbuild/rules_nodejs/commit/aacd924))


### chore

* make defs.bzl error ([3339d46](https://github.com/bazelbuild/rules_nodejs/commit/3339d46)), closes [#1068](https://github.com/bazelbuild/rules_nodejs/issues/1068)


### Code Refactoring

* pkg_npm attributes renames packages=>nested_packages & replacements=>substitutions ([7e1b7df](https://github.com/bazelbuild/rules_nodejs/commit/7e1b7df))
* remove `bootstrap` attribute & fix $(location) expansions in nodejs_binary templated_args ([1860a6a](https://github.com/bazelbuild/rules_nodejs/commit/1860a6a))
* remove templated_args_file from nodejs_binary & nodejs_test ([799acb4](https://github.com/bazelbuild/rules_nodejs/commit/799acb4))
* **builtin:** add `args` to yarn_install & npm_install ([#1462](https://github.com/bazelbuild/rules_nodejs/issues/1462)) ([d245d09](https://github.com/bazelbuild/rules_nodejs/commit/d245d09))
* **builtin:** remove legacy jasmine_node_test ([6d731cf](https://github.com/bazelbuild/rules_nodejs/commit/6d731cf))
* **builtin:** renamed npm_package to pkg_npm to match naming convention ([7df4109](https://github.com/bazelbuild/rules_nodejs/commit/7df4109))
* pre-1.0 release breaking changes ([cc64818](https://github.com/bazelbuild/rules_nodejs/commit/cc64818))
* remove unused exclude_packages from npm_install & yarn_install ([f50dea3](https://github.com/bazelbuild/rules_nodejs/commit/f50dea3))


### Features

* **builtin:** introduce copy_to_bin rule ([#1450](https://github.com/bazelbuild/rules_nodejs/issues/1450)) ([f19245b](https://github.com/bazelbuild/rules_nodejs/commit/f19245b))


### Performance Improvements

* avoid unnecessary nested depset() ([#1435](https://github.com/bazelbuild/rules_nodejs/issues/1435)) ([f386322](https://github.com/bazelbuild/rules_nodejs/commit/f386322))


### BREAKING CHANGES

* `templated_args_file` removed from nodejs_binary, nodejs_test & jasmine_node_test. This was a separation of concerns and complicated node.bzl more than necessary while also being rigid in how the params file is formatted. It is more flexible to expose this functionality as another simple rule named params_file.

To match standard $(location) and $(locations) expansion, params_file args location expansions are also in the standard short_path form (this differs from the old templated_args behavior which was not Bazel idiomatic)
Usage example:

```
load("@build_bazel_rules_nodejs//:index.bzl", "params_file", "nodejs_binary")

params_file(
    name = "params_file",
    args = [
        "--some_param",
        "$(location //path/to/some:file)",
        "--some_other_param",
        "$(location //path/to/some/other:file)",
    ],
    data = [
        "//path/to/some:file",
        "//path/to/some/other:file",
    ],
)

nodejs_binary(
    name = "my_binary",
    data = [":params_file"],
    entry_point = ":my_binary.js",
    templated_args = ["$(location :params_file)"],
)
```
* bootstrap attribute in nodejs_binary, nodejs_test & jasmine_node_test removed

This can be replaced with the `--node_options=--require=$(location label)` argument such as,

```
nodejs_test(
name = "bootstrap_test",
templated_args = ["--node_options=--require=$(rlocation $(location :bootstrap.js))"],
entry_point = ":bootstrap.spec.js",
data = ["bootstrap.js"],
)
```
or
```
jasmine_node_test(
name = "bootstrap_test",
srcs = ["bootstrap.spec.js"],
templated_args = ["--node_options=--require=$(rlocation $(location :bootstrap.js))"],
data = ["bootstrap.js"],
)
```

`templated_args` `$(location)` and `$(locations)` are now correctly expanded when there is no space before ` $(location`
such as `templated_args = ["--node_options=--require=$(rlocation $(location :bootstrap.js))"]`.

Path is returned in runfiles manifest path format such as `repo/path/to/file`. This differs from how $(location)
and $(locations) expansion behaves in expansion the `args` attribute of a *_binary or *_test which returns
the runfiles short path of the format `./path/to/file` for user repo and `../external_repo/path/to/file` for external
repositories. We may change this behavior in the future with $(mlocation) and $(mlocations) used to expand
to the runfiles manifest path.
See https://docs.bazel.build/versions/master/be/common-definitions.html#common-attributes-binaries.
* * pkg_npm attribute packages renamed to nested_packages
* pkg_npm attribute replacements renamed to substitutions
* **builtin:** legacy @build_bazel_rules_nodejs//internal/jasmine_node_test removed; use jasmine_node_test from @bazel/jasmine npm package instead
* **builtin:** `args` in yarn_install and npm_install can be used to pass arbitrary arguments so we removed the following attributes:
* prod_only from yarn_install and npm_install; should be replaced by args = ["--prod"] and args = ["--production"] respectively
* frozen_lockfile from yarn_install; should be replaced by args = ["--frozen-lockfile"]
* network_timeout from yanr_install; should be replaced by args = ["--network_timeout", "<time in ms>"]
* **builtin:** `npm_package` renamed to `pkg_npm`. This is to match the naming convention for package rules https://docs.bazel.build/versions/master/be/pkg.html.
* Users must now switch to loading from index.bzl
* Removed unused exclude_packages from npm_install & yarn_install
* //:declaration_provider.bzl deleted; load from //:providers.bzl instead
//internal/common:npm_pacakge_info.bzl removed; load from //:providers.bzl instead
transitive_js_ecma_script_module_info macro removed; use js_ecma_script_module_info instead
@npm_bazel_karma//:browser_repositories.bzl removed; use @io_bazel_rules_webtesting//web/versioned:browsers-0.3.2.bzl instead
@npm_bazel_protractor//:browser_repositories.bzl removed; use @io_bazel_rules_webtesting//web/versioned:browsers-0.3.2.bzl instead
ts_web_test & ts_web_test_suite marcos removed; use karma_web_test & karma_web_test_suite instead



## [0.42.3](https://github.com/bazelbuild/rules_nodejs/compare/0.42.2...0.42.3) (2019-12-10)

To upgrade:

```python
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "a54b2511d6dae42c1f7cdaeb08144ee2808193a088004fc3b464a04583d5aa2e",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/0.42.3/rules_nodejs-0.42.3.tar.gz"],
)
```

and run `yarn upgrade --scope @bazel` to update all your `@bazel`-scoped npm packages to the latest versions.
(or manually do the npm equivalent - they don't have a way to update a scope)

### Bug Fixes

* **builtin:** handle scoped packages in generated npm_umd_bundle targets ([#1425](https://github.com/bazelbuild/rules_nodejs/issues/1425)) ([e9e2e8e](https://github.com/bazelbuild/rules_nodejs/commit/e9e2e8e)), closes [#1095](https://github.com/bazelbuild/rules_nodejs/issues/1095)
* **builtin:** only stamp artifacts when --stamp is passed to bazel ([#1441](https://github.com/bazelbuild/rules_nodejs/issues/1441)) ([cbaab60](https://github.com/bazelbuild/rules_nodejs/commit/cbaab60))
* **docs** default values are now documented for rule attributes

### Features

* **builtin:** wire linker/node-patches to npm-generated index.bzl rules ([3321ed5](https://github.com/bazelbuild/rules_nodejs/commit/3321ed5)), closes [#1382](https://github.com/bazelbuild/rules_nodejs/issues/1382)



## [0.42.2](https://github.com/bazelbuild/rules_nodejs/compare/0.42.1...0.42.2) (2019-12-04)


### Bug Fixes

* **builtin:** additional_root_paths in pkg_web should also include paths in genfiles and bin dirs ([#1402](https://github.com/bazelbuild/rules_nodejs/issues/1402)) ([9ce8c85](https://github.com/bazelbuild/rules_nodejs/commit/9ce8c85))
* **typescript:** fix for cross platform ts_devserver issue [#1409](https://github.com/bazelbuild/rules_nodejs/issues/1409) ([#1413](https://github.com/bazelbuild/rules_nodejs/issues/1413)) ([172caff](https://github.com/bazelbuild/rules_nodejs/commit/172caff)), closes [#1415](https://github.com/bazelbuild/rules_nodejs/issues/1415)
* support realpath.native and fix crash in mkdirp ([b9282b9](https://github.com/bazelbuild/rules_nodejs/commit/b9282b9))



## [0.42.1](https://github.com/bazelbuild/rules_nodejs/compare/0.41.0...0.42.1) (2019-11-27)

To upgrade:

```python
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "c612d6b76eaa17540e8b8c806e02701ed38891460f9ba3303f4424615437887a",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/0.42.1/rules_nodejs-0.42.1.tar.gz"],
)
```

and run `yarn upgrade --scope @bazel` to update all your `@bazel`-scoped npm packages to the latest versions.
(or manually do the npm equivalent - they don't have a way to update a scope)

### New stuff

In 0.41.0 we noted that a feature for inserting `<script>` and `<link>` tags was dropped from `ts_devserver` and `pkg_web` but the replacement wasn't available. Now it is thanks to @jbedard who published a standalone npm package `html-insert-assets`. You can see how it's wired in the examples.

If you waited to upgrade before, now you should.

### Bug Fixes

* @npm//foobar:foobar__files target no longer includes nested node_modules ([#1390](https://github.com/bazelbuild/rules_nodejs/issues/1390)) ([a13f2b6](https://github.com/bazelbuild/rules_nodejs/commit/a13f2b6))
* allow files in protractor data attribute ([3feb13c](https://github.com/bazelbuild/rules_nodejs/commit/3feb13c))
* **builtin:** $(RULEDIR) npm_package_bin expansion should always be the root output directory ([b494974](https://github.com/bazelbuild/rules_nodejs/commit/b494974))
* **builtin:** locations arg of npm_package_bin should result in separate argv ([242379f](https://github.com/bazelbuild/rules_nodejs/commit/242379f))
* **builtin:** use correct genrule-style make vars ([77039b1](https://github.com/bazelbuild/rules_nodejs/commit/77039b1))
* **examples:** kotlin example server working ([adf6934](https://github.com/bazelbuild/rules_nodejs/commit/adf6934))


### BREAKING CHANGES

* **builtin:** We fixed `npm_package_bin` and all rules generated by it, to match genrule behavior as documented at https://docs.bazel.build/versions/master/be/make-variables.html#predefined_genrule_variables
This means that usage of the `$@` shortcut to refer to the output directory should now be `$(@D)` when `output_dir=True`
and you can now use `$@` to refer to the location of a single output



# [0.41.0](https://github.com/bazelbuild/rules_nodejs/compare/0.40.0...0.41.0) (2019-11-22)

To upgrade:

```
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "8dc1466f8563f3aa4ac7ab7aa3c96651eb7764108219f40b2d1c918e1a81c601",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/0.41.0/rules_nodejs-0.41.0.tar.gz"],
)
```

and run `yarn upgrade --scope @bazel` to update all your `@bazel`-scoped npm packages to the latest versions.
(or manually do the npm equivalent - they don't have a way to update a scope)

### BREAKING CHANGES

As mentioned before, we are close to a 1.0 release, so we are making all our breaking changes now to prepare for a period of stability. Sorry for the long list this time!

* `web_package` rule has been renamed to `pkg_web` and is now a public API

Update your load statements from

```python
load("@build_bazel_rules_nodejs//internal/web_package:web_package.bzl", "web_package")
```

to

```python
load("@build_bazel_rules_nodejs//:index.bzl", "pkg_web")
```

* `ts_devserver` and `pkg_web` (previously `web_package`) no longer have an `index_html` attribute.

They expect an index.html file to be among the assets, and to already
have the script and link tags needed for the app to work.

The feature where those tags were injected into the html dynamically has
been moved to its own rule, inject_html.

We are in a transition state where the `inject_html` rule is not published, because we want this to be a plain npm package and not Bazel-specific. We will publish this functionality soon. If you depend on it, you may want to delay this upgrade.

* internal/rollup_bundle rule is removed. see https://github.com/bazelbuild/rules_nodejs/wiki for migration instructions

* Removed the expand_location_into_runfiles helper from //internal:node.bzl
Load it from //internal/common:expand_into_runfiles instead

* npm karma deps for karma_web_test and karma_web_suite are now peer deps so that the versions used can be chosen by the user.

This PR also removes the built-in  `@io_bazel_rules_webtesting//browsers/sauce:chrome-win10` saucelabs support. It is not very useful as it only tests a single browser and it difficult to use. In the angular repo, saucelabs support was implemented with a custom karma config using karma_web_test. This is the recommended approach.

* `--define=DEBUG=1` is no longer functional to request debugging outputs. Use `-c dbg` instead (this matches Bazel's behavior for C++).

* We renamed some of the generated targets in the `@nodejs//` workspace:

`bazel run @nodejs//:npm` is replaced with `bazel run @nodejs//:npm_node_repositories` and `bazel run @nodejs//:yarn` is replaced with `bazel run @nodejs//:yarn_node_repositories`. `@nodejs//:yarn` and `@nodejs//:npm` now run yarn & npm in the current working directory instead of on all of the `package.json` files in `node_repositories()`.

`@nodejs//:bin/node` & `@nodejs//:bin/node.cmd` (on Windows) are no longer valid targets. Use `@nodejs//:node` instead on all platforms. You can still call the old targets in their platform specific node repositories such as `@nodejs_darwin_amd64//:bin/node`.

`@nodejs//:bin/yarn` & `@nodejs//:bin/yarn.cmd` (on Windows) are no longer valid targets. Use `@nodejs//:yarn` instead on all platforms. You can still call the old targets in their platform specific node repositories such as `@nodejs_darwin_amd64//:bin/yarn`.

`@nodejs//:bin/npm` & `@nodejs//:bin/npm.cmd` (on Windows) are no longer valid targets. Use `@nodejs//:npm` instead on all platforms. You can still call the old targets in their platform specific node repositories such as `@nodejs_darwin_amd64//:bin/npm`.


### Bug Fixes

* **builtin:** allow .tsx entry_point in node binary/test ([313d484](https://github.com/bazelbuild/rules_nodejs/commit/313d484)), closes [#1351](https://github.com/bazelbuild/rules_nodejs/issues/1351)
* **terser:** call terser binary instead of uglifyjs ([#1360](https://github.com/bazelbuild/rules_nodejs/issues/1360)) ([a100420](https://github.com/bazelbuild/rules_nodejs/commit/a100420))
* **terser:** remove ngDevMode & ngI18nClosureMode global_defs from default terser config ([98c8dbc](https://github.com/bazelbuild/rules_nodejs/commit/98c8dbc))


### chore

* remove deprecated re-export file ([148bf8a](https://github.com/bazelbuild/rules_nodejs/commit/148bf8a))
* remove old rollup_bundle ([9a824ac](https://github.com/bazelbuild/rules_nodejs/commit/9a824ac)), closes [#740](https://github.com/bazelbuild/rules_nodejs/issues/740)


### Code Refactoring

* move injector feature to own rule ([be06d23](https://github.com/bazelbuild/rules_nodejs/commit/be06d23))


### Features

* node-patches\filesystem patcher. ([#1332](https://github.com/bazelbuild/rules_nodejs/issues/1332)) ([0b2f675](https://github.com/bazelbuild/rules_nodejs/commit/0b2f675))
* support --compilation_mode flag ([9fa4343](https://github.com/bazelbuild/rules_nodejs/commit/9fa4343))
* **builtin:** rename @nodejs//:npm and @nodejs//:yarn to @nodejs//:[yarn/npm]_node_repositories ([#1369](https://github.com/bazelbuild/rules_nodejs/issues/1369)) ([01079a3](https://github.com/bazelbuild/rules_nodejs/commit/01079a3))
* **karma:** npm peer deps & remove [@rules](https://github.com/rules)_webtesting//browsers/sauce:chrome-win10 support ([318bbf3](https://github.com/bazelbuild/rules_nodejs/commit/318bbf3))
* **protractor:** protractor npm package is now a peer deps ([#1352](https://github.com/bazelbuild/rules_nodejs/issues/1352)) ([5db7c8e](https://github.com/bazelbuild/rules_nodejs/commit/5db7c8e))


# [0.40.0](https://github.com/bazelbuild/rules_nodejs/compare/0.39.1...0.40.0) (2019-11-13)


### Bug Fixes

* fix nodejs_binary cross-platform RBE issue [#1305](https://github.com/bazelbuild/rules_nodejs/issues/1305) ([38d0b3d](https://github.com/bazelbuild/rules_nodejs/commit/38d0b3d))
* prevent dpulicate entries in owners files for global owners ([afea290](https://github.com/bazelbuild/rules_nodejs/commit/afea290))


### Features

* **karma:** remove ts_web_test and ts_web_test_suite rules ([8384562](https://github.com/bazelbuild/rules_nodejs/commit/8384562))
* **terser:** add `args` attribute to support additional command line arguments ([563bad7](https://github.com/bazelbuild/rules_nodejs/commit/563bad7))



## [0.39.1](https://github.com/bazelbuild/rules_nodejs/compare/0.39.0...0.39.1) (2019-10-29)


### Bug Fixes

* fix for https://github.com/bazelbuild/rules_nodejs/issues/1307 ([7163571](https://github.com/bazelbuild/rules_nodejs/commit/7163571))
* **karma:** load scripts in strict mode ([5498f93](https://github.com/bazelbuild/rules_nodejs/commit/5498f93)), closes [#922](https://github.com/bazelbuild/rules_nodejs/issues/922)


### Features

* **examples:** demonstrate using Webpack to build and serve a React app ([c5d0909](https://github.com/bazelbuild/rules_nodejs/commit/c5d0909))



# [0.39.0](https://github.com/bazelbuild/rules_nodejs/compare/0.38.3...0.39.0) (2019-10-23)


### Bug Fixes

* bundle names in angular examples ([b4f01e2](https://github.com/bazelbuild/rules_nodejs/commit/b4f01e2))
* **builtin:** allow more than 2 segments in linker module names ([7e98089](https://github.com/bazelbuild/rules_nodejs/commit/7e98089))
* webpack should be a peerDep of @bazel/labs ([312aa4d](https://github.com/bazelbuild/rules_nodejs/commit/312aa4d))


### Code Refactoring

* remove dynamic_deps feature ([#1276](https://github.com/bazelbuild/rules_nodejs/issues/1276)) ([b916d61](https://github.com/bazelbuild/rules_nodejs/commit/b916d61))


### Features

* **builtin:** turn off a strict requirement for peer dependencies ([#1163](https://github.com/bazelbuild/rules_nodejs/issues/1163)) ([bd2f108](https://github.com/bazelbuild/rules_nodejs/commit/bd2f108))
* **examples:** add Jest example ([#1274](https://github.com/bazelbuild/rules_nodejs/issues/1274)) ([f864462](https://github.com/bazelbuild/rules_nodejs/commit/f864462)), closes [/github.com/ecosia/bazel_rules_nodejs_contrib/issues/4#issuecomment-475291612](https://github.com//github.com/ecosia/bazel_rules_nodejs_contrib/issues/4/issues/issuecomment-475291612)


### BREAKING CHANGES

* The dynamic_deps attribute of yarn_install and npm_install is removed,
in favor of declaring needed packages in the deps/data of the rule that
invokes the tool.



## [0.38.3](https://github.com/bazelbuild/rules_nodejs/compare/0.38.2...0.38.3) (2019-10-11)


### Bug Fixes

* **terser:** terser_minified should support .mjs files when running on directory ([#1264](https://github.com/bazelbuild/rules_nodejs/issues/1264)) ([6b09b51](https://github.com/bazelbuild/rules_nodejs/commit/6b09b51))


### Features

* **examples:** angular view engine example ([#1252](https://github.com/bazelbuild/rules_nodejs/issues/1252)) ([c10272a](https://github.com/bazelbuild/rules_nodejs/commit/c10272a))
* **terser:** support .map files in directory inputs ([#1250](https://github.com/bazelbuild/rules_nodejs/issues/1250)) ([dfefc11](https://github.com/bazelbuild/rules_nodejs/commit/dfefc11))



## [0.38.2](https://github.com/bazelbuild/rules_nodejs/compare/0.38.1...0.38.2) (2019-10-09)


### Bug Fixes

* clean_nested_workspaces.sh ([acaa5fb](https://github.com/bazelbuild/rules_nodejs/commit/acaa5fb))
* **rollup:** handle transitive npm deps in rollup_bundle ([77289e0](https://github.com/bazelbuild/rules_nodejs/commit/77289e0))
* dont generate build files in symlinked node_modules ([#1111](https://github.com/bazelbuild/rules_nodejs/issues/1111)) ([2e7de34](https://github.com/bazelbuild/rules_nodejs/commit/2e7de34)), closes [#871](https://github.com/bazelbuild/rules_nodejs/issues/871)
* linker can't assume that transitive module_mappings are in the sandbox ([a67a844](https://github.com/bazelbuild/rules_nodejs/commit/a67a844))


### Features

* **examples:** add closure compiler example ([79b0927](https://github.com/bazelbuild/rules_nodejs/commit/79b0927))
* document the escape hatch from ts_library ([#1247](https://github.com/bazelbuild/rules_nodejs/issues/1247)) ([baa9aa8](https://github.com/bazelbuild/rules_nodejs/commit/baa9aa8))
* **examples:** illustrate how to run a mocha test ([#1216](https://github.com/bazelbuild/rules_nodejs/issues/1216)) ([5485a8a](https://github.com/bazelbuild/rules_nodejs/commit/5485a8a))
* **examples:** update examples/angular to new rollup_bundle ([#1238](https://github.com/bazelbuild/rules_nodejs/issues/1238)) ([54f5d8c](https://github.com/bazelbuild/rules_nodejs/commit/54f5d8c))
* **terser:** add source map links ([32eb7ca](https://github.com/bazelbuild/rules_nodejs/commit/32eb7ca))
* **typescript:** add a transitive_js_ecma_script_module_info alias to js_ecma_script_module_info ([#1243](https://github.com/bazelbuild/rules_nodejs/issues/1243)) ([77e2d4a](https://github.com/bazelbuild/rules_nodejs/commit/77e2d4a))
* **typescript:** add direct_sources field to JSEcmaScriptModuleInfo ([1ee00e6](https://github.com/bazelbuild/rules_nodejs/commit/1ee00e6))
* **typescript:** add JSNamedModuleInfo provider to ts_library outputs ([#1215](https://github.com/bazelbuild/rules_nodejs/issues/1215)) ([bb1f9b4](https://github.com/bazelbuild/rules_nodejs/commit/bb1f9b4))



## [0.38.1](https://github.com/bazelbuild/rules_nodejs/compare/0.38.0...0.38.1) (2019-10-03)


### Bug Fixes

* **builtin:** bugs in 0.38 found while rolling out to angular repo ([d2262c8](https://github.com/bazelbuild/rules_nodejs/commit/d2262c8))
* **README:** update "sections below" reference ([#1210](https://github.com/bazelbuild/rules_nodejs/issues/1210)) ([a59203c](https://github.com/bazelbuild/rules_nodejs/commit/a59203c))
* invalidate installed npm repositories correctly ([#1200](https://github.com/bazelbuild/rules_nodejs/issues/1200)) ([#1205](https://github.com/bazelbuild/rules_nodejs/issues/1205)) ([0312800](https://github.com/bazelbuild/rules_nodejs/commit/0312800))
* **docs:** fix typo in TypeScript.md ([#1211](https://github.com/bazelbuild/rules_nodejs/issues/1211)) ([893f61e](https://github.com/bazelbuild/rules_nodejs/commit/893f61e))
* pin @bazel/karma karma dep to ~4.1.0 as 4.2.0 breaks stack traces in karma output ([4e86283](https://github.com/bazelbuild/rules_nodejs/commit/4e86283))


### Features

* **examples:** updated to angular 8.2.8 in examples/angular ([#1226](https://github.com/bazelbuild/rules_nodejs/issues/1226)) ([697bd22](https://github.com/bazelbuild/rules_nodejs/commit/697bd22))
* **examples:** upgrade to v9 and enable ivy ([#1227](https://github.com/bazelbuild/rules_nodejs/issues/1227)) ([1c7426f](https://github.com/bazelbuild/rules_nodejs/commit/1c7426f))



# [0.38.0](https://github.com/bazelbuild/rules_nodejs/compare/0.37.0...0.38.0) (2019-09-26)


### Bug Fixes

* **builtin:** linker test should run program as an action ([#1113](https://github.com/bazelbuild/rules_nodejs/issues/1113)) ([7f0102e](https://github.com/bazelbuild/rules_nodejs/commit/7f0102e))
* add golden file ([9a02ee0](https://github.com/bazelbuild/rules_nodejs/commit/9a02ee0))
* add missing async test fixes ([12f711a](https://github.com/bazelbuild/rules_nodejs/commit/12f711a))
* **builtin:** support for scoped modules in linker ([#1199](https://github.com/bazelbuild/rules_nodejs/issues/1199)) ([94abf68](https://github.com/bazelbuild/rules_nodejs/commit/94abf68))
* **protractor:** update rules_webtesting patch to include additional windows fixes ([#1140](https://github.com/bazelbuild/rules_nodejs/issues/1140)) ([f76e97b](https://github.com/bazelbuild/rules_nodejs/commit/f76e97b))
* **rollup:** npm requires an index.js file ([2ababdf](https://github.com/bazelbuild/rules_nodejs/commit/2ababdf))


### chore

* cleanup some deprecated APIs ([#1160](https://github.com/bazelbuild/rules_nodejs/issues/1160)) ([cefc2ae](https://github.com/bazelbuild/rules_nodejs/commit/cefc2ae)), closes [#1144](https://github.com/bazelbuild/rules_nodejs/issues/1144)


### Code Refactoring

* remove http_server and history_server rules ([#1158](https://github.com/bazelbuild/rules_nodejs/issues/1158)) ([01fdeec](https://github.com/bazelbuild/rules_nodejs/commit/01fdeec))


### Features

* **builtin:** detect APF node module format if ANGULAR_PACKAGE file found ([#1112](https://github.com/bazelbuild/rules_nodejs/issues/1112)) ([162e436](https://github.com/bazelbuild/rules_nodejs/commit/162e436))
* **builtin:** expose the new linker to node programs ([65d8a36](https://github.com/bazelbuild/rules_nodejs/commit/65d8a36))
* **builtin:** introduce npm_package_bin ([#1139](https://github.com/bazelbuild/rules_nodejs/issues/1139)) ([2fd80cf](https://github.com/bazelbuild/rules_nodejs/commit/2fd80cf))
* **builtin:** linker should resolve workspace-absolute paths ([307a796](https://github.com/bazelbuild/rules_nodejs/commit/307a796))
* **builtin:** npm_package_bin can produce directory output ([#1164](https://github.com/bazelbuild/rules_nodejs/issues/1164)) ([6d8c625](https://github.com/bazelbuild/rules_nodejs/commit/6d8c625))
* **examples:** demonstrate that a macro assembles a workflow ([7231aaa](https://github.com/bazelbuild/rules_nodejs/commit/7231aaa))
* **examples:** replace examples/webapp with new rollup_bundle ([c6cd91c](https://github.com/bazelbuild/rules_nodejs/commit/c6cd91c))
* **examples:** the Angular example now lives in rules_nodejs ([9072ddb](https://github.com/bazelbuild/rules_nodejs/commit/9072ddb))
* **rollup:** ensure that sourcemaps work end-to-end ([f340589](https://github.com/bazelbuild/rules_nodejs/commit/f340589))
* **rollup:** new implementation of rollup_bundle in @bazel/rollup package ([3873715](https://github.com/bazelbuild/rules_nodejs/commit/3873715)), closes [#532](https://github.com/bazelbuild/rules_nodejs/issues/532) [#724](https://github.com/bazelbuild/rules_nodejs/issues/724)
* **rollup:** support multiple entry points ([f660d39](https://github.com/bazelbuild/rules_nodejs/commit/f660d39))
* **rollup:** tests and docs for new rollup_bundle ([cfef773](https://github.com/bazelbuild/rules_nodejs/commit/cfef773))
* **terser:** support directory inputs ([21b5142](https://github.com/bazelbuild/rules_nodejs/commit/21b5142))
* add angular example ([#1124](https://github.com/bazelbuild/rules_nodejs/issues/1124)) ([c376355](https://github.com/bazelbuild/rules_nodejs/commit/c376355))
* **terser:** support source map files ([#1195](https://github.com/bazelbuild/rules_nodejs/issues/1195)) ([d5bac48](https://github.com/bazelbuild/rules_nodejs/commit/d5bac48))
* **typescript:** add JSEcmaScriptModuleInfo provider to ts_library outputs ([1433eb9](https://github.com/bazelbuild/rules_nodejs/commit/1433eb9))


### BREAKING CHANGES

* @bazel/typescript and @bazel/karma no longer have a defs.bzl file. Use
index.bzl instead.

The @yarn workspace is no longer created. Use @nodejs//:yarn instead.
* history_server and http_server rules are no longer built-in.

To use them, first install the http-server and/or history-server packages
Then load("@npm//http-server:index.bzl", "http_server")
(or replace with history-server, noting that the rule has underscore where the package has hyphen)



## [0.37.1](https://github.com/bazelbuild/rules_nodejs/compare/0.37.0...0.37.1) (2019-09-16)


### Bug Fixes

* **protractor:** update rules_webtesting patch to include additional windows fixes ([#1140](https://github.com/bazelbuild/rules_nodejs/issues/1140)) ([f76e97b](https://github.com/bazelbuild/rules_nodejs/commit/f76e97b))
* **rollup:** npm requires an index.js file ([2ababdf](https://github.com/bazelbuild/rules_nodejs/commit/2ababdf))
* add golden file ([9a02ee0](https://github.com/bazelbuild/rules_nodejs/commit/9a02ee0))
* add missing async test fixes ([12f711a](https://github.com/bazelbuild/rules_nodejs/commit/12f711a))
* **builtin:** linker test should run program as an action ([#1113](https://github.com/bazelbuild/rules_nodejs/issues/1113)) ([7f0102e](https://github.com/bazelbuild/rules_nodejs/commit/7f0102e))


### Features

* **examples:** the Angular example now lives in rules_nodejs ([9072ddb](https://github.com/bazelbuild/rules_nodejs/commit/9072ddb))
* add angular example ([#1124](https://github.com/bazelbuild/rules_nodejs/issues/1124)) ([c376355](https://github.com/bazelbuild/rules_nodejs/commit/c376355))
* **builtin:** detect APF node module format if ANGULAR_PACKAGE file found ([#1112](https://github.com/bazelbuild/rules_nodejs/issues/1112)) ([162e436](https://github.com/bazelbuild/rules_nodejs/commit/162e436))
* **builtin:** expose the new linker to node programs ([65d8a36](https://github.com/bazelbuild/rules_nodejs/commit/65d8a36))
* **rollup:** new implementation of rollup_bundle in @bazel/rollup package ([3873715](https://github.com/bazelbuild/rules_nodejs/commit/3873715)), closes [#532](https://github.com/bazelbuild/rules_nodejs/issues/532) [#724](https://github.com/bazelbuild/rules_nodejs/issues/724)
* **rollup:** support multiple entry points ([f660d39](https://github.com/bazelbuild/rules_nodejs/commit/f660d39))
* **rollup:** tests and docs for new rollup_bundle ([cfef773](https://github.com/bazelbuild/rules_nodejs/commit/cfef773))
* **terser:** support directory inputs ([21b5142](https://github.com/bazelbuild/rules_nodejs/commit/21b5142))



# [0.37.0](https://github.com/bazelbuild/rules_nodejs/compare/0.36.2...0.37.0) (2019-09-06)


### Bug Fixes

* **builtin:** --nolegacy_external_runfiles on build ([38814aa](https://github.com/bazelbuild/rules_nodejs/commit/38814aa))
* **builtin:** fix localWorkspacePath logic ([0a7fb01](https://github.com/bazelbuild/rules_nodejs/commit/0a7fb01)), closes [#1087](https://github.com/bazelbuild/rules_nodejs/issues/1087)
* **npm_install:** dynamic_deps attribute not working for scoped packages ([bf68577](https://github.com/bazelbuild/rules_nodejs/commit/bf68577))
* node executables not running on windows if bash toolchain path ([#1104](https://github.com/bazelbuild/rules_nodejs/issues/1104)) ([c82b43d](https://github.com/bazelbuild/rules_nodejs/commit/c82b43d))
* node_loader windows fix for RUNFILES_MANIFEST_FILE slashes ([d3886ce](https://github.com/bazelbuild/rules_nodejs/commit/d3886ce))


### chore

* remove tsc_wrapped_deps compatibility ([#1100](https://github.com/bazelbuild/rules_nodejs/issues/1100)) ([5e98bda](https://github.com/bazelbuild/rules_nodejs/commit/5e98bda)), closes [#1086](https://github.com/bazelbuild/rules_nodejs/issues/1086)


### Features

* add default DEBUG and VERBOSE_LOGS configuration_env_vars to nodejs_binary ([#1080](https://github.com/bazelbuild/rules_nodejs/issues/1080)) ([df37fca](https://github.com/bazelbuild/rules_nodejs/commit/df37fca))
* **builtin:** add Kotlin example ([0912014](https://github.com/bazelbuild/rules_nodejs/commit/0912014))
* **builtin:** introduce a linker ([62037c9](https://github.com/bazelbuild/rules_nodejs/commit/62037c9))


### BREAKING CHANGES

* A compatibility layer was removed. See discussion in https://github.com/bazelbuild/rules_nodejs/issues/1086



## [0.36.2](https://github.com/bazelbuild/rules_nodejs/compare/0.36.1...0.36.2) (2019-08-30)


### Bug Fixes

* account for breaking path change in new chromedriver distro ([d8a0ccb](https://github.com/bazelbuild/rules_nodejs/commit/d8a0ccb)), closes [/github.com/bazelbuild/rules_webtesting/commit/62062b4bd111acc8598bfc816e87cda012bdaae6#diff-bb710201187c4ad0a3fbbe941ffc4b0](https://github.com//github.com/bazelbuild/rules_webtesting/commit/62062b4bd111acc8598bfc816e87cda012bdaae6/issues/diff-bb710201187c4ad0a3fbbe941ffc4b0)
* patching rules_webtesting to fix chrome path ([97933d8](https://github.com/bazelbuild/rules_nodejs/commit/97933d8))
* **builtin:** reformat the error message for Node loader.js ([67bca8f](https://github.com/bazelbuild/rules_nodejs/commit/67bca8f)), closes [/github.com/nodejs/node/blob/a49b20d3245dd2a4d890e28582f3c013c07c3136/lib/internal/modules/cjs/loader.js#L264](https://github.com//github.com/nodejs/node/blob/a49b20d3245dd2a4d890e28582f3c013c07c3136/lib/internal/modules/cjs/loader.js/issues/L264)
* **karma:** error messages truncated due to custom formatter ([f871be6](https://github.com/bazelbuild/rules_nodejs/commit/f871be6))
* **typescript:** add peerDependency on typescript ([48c5088](https://github.com/bazelbuild/rules_nodejs/commit/48c5088))


### Features

* **builtin:** add a DeclarationInfo provider ([3d7eb13](https://github.com/bazelbuild/rules_nodejs/commit/3d7eb13))
* add templated_args_file to allow long agrs to be written to a file ([b34d7bb](https://github.com/bazelbuild/rules_nodejs/commit/b34d7bb))
* **builtin:** support yarn --frozen_lockfile ([426861f](https://github.com/bazelbuild/rules_nodejs/commit/426861f))
* **terser:** introduce @bazel/terser package ([232acfe](https://github.com/bazelbuild/rules_nodejs/commit/232acfe))



## [0.36.1](https://github.com/bazelbuild/rules_nodejs/compare/0.36.0...0.36.1) (2019-08-20)


### Features

* **builtin:** add browser to rollup mainFields ([e488cb6](https://github.com/bazelbuild/rules_nodejs/commit/e488cb6))
* **builtin:** introduce dynamic dependencies concept ([a47410e](https://github.com/bazelbuild/rules_nodejs/commit/a47410e))
* **less:** add less link to the docs's drawer ([ec6e0d1](https://github.com/bazelbuild/rules_nodejs/commit/ec6e0d1))
* **less:** new less package ([462f6e9](https://github.com/bazelbuild/rules_nodejs/commit/462f6e9))
* **less:** updated default compiler to @bazel/less as mentioned in code review ([fd71f26](https://github.com/bazelbuild/rules_nodejs/commit/fd71f26))
* **less:** updated package.json in e2e/less to pull latest ([6027aa3](https://github.com/bazelbuild/rules_nodejs/commit/6027aa3))



# [0.36.0](https://github.com/bazelbuild/rules_nodejs/compare/0.35.0...0.36.0) (2019-08-15)


### Bug Fixes

* **jasmine:** correct comment about behavior of config_file attr ([59a7239](https://github.com/bazelbuild/rules_nodejs/commit/59a7239))
* fix yarn_install yarn cache mutex bug ([31aa1a6](https://github.com/bazelbuild/rules_nodejs/commit/31aa1a6))
* get rules_go dependency from build_bazel_rules_typescript ([ea6ee0b](https://github.com/bazelbuild/rules_nodejs/commit/ea6ee0b))
* npm_package issue with external files on windows ([8679b9e](https://github.com/bazelbuild/rules_nodejs/commit/8679b9e))
* sconfig deps sandbox bug ([161693c](https://github.com/bazelbuild/rules_nodejs/commit/161693c))


### Features

* **jasmine:** introduce config_file attribute ([b0b2648](https://github.com/bazelbuild/rules_nodejs/commit/b0b2648))
* **jasmine_node_test:** add attr `jasmine_config` ([715ffc6](https://github.com/bazelbuild/rules_nodejs/commit/715ffc6))
* **worker:** new worker package ([9e26856](https://github.com/bazelbuild/rules_nodejs/commit/9e26856))
* add browser module main priority to generated umd bundles ([17cfac9](https://github.com/bazelbuild/rules_nodejs/commit/17cfac9))



# [0.35.0](https://github.com/bazelbuild/rules_nodejs/compare/0.34.0...0.35.0) (2019-08-02)


### Bug Fixes

* **jasmine:** enforce that jasmine_node_test is loaded from new location ([7708858](https://github.com/bazelbuild/rules_nodejs/commit/7708858)), closes [#838](https://github.com/bazelbuild/rules_nodejs/issues/838)
* fencing for npm packages ([#946](https://github.com/bazelbuild/rules_nodejs/issues/946)) ([780dfb4](https://github.com/bazelbuild/rules_nodejs/commit/780dfb4))


### Features

* **builtin:** do code splitting even if only one entry point ([f51c129](https://github.com/bazelbuild/rules_nodejs/commit/f51c129))
* **stylus:** add initial stylus rule ([804a788](https://github.com/bazelbuild/rules_nodejs/commit/804a788))
* **stylus:** output sourcemap ([dac014a](https://github.com/bazelbuild/rules_nodejs/commit/dac014a))
* **stylus:** support import by allowing files in deps ([3987070](https://github.com/bazelbuild/rules_nodejs/commit/3987070))


### BREAKING CHANGES

* **jasmine:** You can no longer get jasmine_node_test from @build_bazel_rules_nodejs.
- Use `load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")`
instead
- You need to remove `@npm//jasmine` from the deps of the
jasmine_node_test
- If you use user-managed dependencies, see the commit for examples of
the change needed

Also makes the repo bazel-lint-clean, so running yarn bazel:lint-fix no
longer makes edits.



# [0.34.0](https://github.com/bazelbuild/rules_nodejs/compare/0.33.1...0.34.0) (2019-07-23)


### Bug Fixes

* **builtin:** process/browser should resolve from browserify ([a98eda7](https://github.com/bazelbuild/rules_nodejs/commit/a98eda7))
* fix for node windows cross-compile ([001d945](https://github.com/bazelbuild/rules_nodejs/commit/001d945)), closes [#909](https://github.com/bazelbuild/rules_nodejs/issues/909)
* node runfiles resolution from external workspaces ([82500de](https://github.com/bazelbuild/rules_nodejs/commit/82500de))


### Features

* **protractor:** add protractor rule ([35a344c](https://github.com/bazelbuild/rules_nodejs/commit/35a344c))



## [0.33.1](https://github.com/bazelbuild/rules_nodejs/compare/0.33.0...0.33.1) (2019-07-12)


### Bug Fixes

* **builtin:** include package.json files in browserify inputs ([13c09e6](https://github.com/bazelbuild/rules_nodejs/commit/13c09e6))



# [0.33.0](https://github.com/bazelbuild/rules_nodejs/compare/0.32.2...0.33.0) (2019-07-12)


### Bug Fixes

* **builtin:** update to latest ncc ([c1e3f4d](https://github.com/bazelbuild/rules_nodejs/commit/c1e3f4d)), closes [#771](https://github.com/bazelbuild/rules_nodejs/issues/771)
* **builtin:** use a local mod to revert a browserify change ([253e9cb](https://github.com/bazelbuild/rules_nodejs/commit/253e9cb))


### Features

* **builtin:** add nodejs toolchain support ([9afb8db](https://github.com/bazelbuild/rules_nodejs/commit/9afb8db))



## [0.32.2](https://github.com/bazelbuild/rules_nodejs/compare/0.32.1...0.32.2) (2019-06-21)


### Bug Fixes

* **builtin:** add test case for @bazel/hide-bazel-files bug ([2a63ed6](https://github.com/bazelbuild/rules_nodejs/commit/2a63ed6))
* **builtin:** always hide bazel files in yarn_install & npm install--- ([0104be7](https://github.com/bazelbuild/rules_nodejs/commit/0104be7))



## [0.32.1](https://github.com/bazelbuild/rules_nodejs/compare/0.32.0...0.32.1) (2019-06-19)


### Bug Fixes

* **typescript:** exclude typescript lib declarations in ([3d55b41](https://github.com/bazelbuild/rules_nodejs/commit/3d55b41))
* **typescript:** remove override of @bazel/tsetse ([2e128ce](https://github.com/bazelbuild/rules_nodejs/commit/2e128ce))



# [0.32.0](https://github.com/bazelbuild/rules_nodejs/compare/0.31.1...0.32.0) (2019-06-18)


### Bug Fixes

* **builtin:** add @bazel/hide-bazel-files utility ([e7d2fbd](https://github.com/bazelbuild/rules_nodejs/commit/e7d2fbd))
* **builtin:** fix for issue 834 ([#847](https://github.com/bazelbuild/rules_nodejs/issues/847)) ([c0fe512](https://github.com/bazelbuild/rules_nodejs/commit/c0fe512))
* **builtin:** fix for symlinked node_modules issue [#802](https://github.com/bazelbuild/rules_nodejs/issues/802) ([43cebe7](https://github.com/bazelbuild/rules_nodejs/commit/43cebe7))
* **create:** run ts_setup_workspace in TypeScript workspaces ([c8e61c5](https://github.com/bazelbuild/rules_nodejs/commit/c8e61c5))
* **typescript:** fix issue with types[] in non-sandboxed tsc ([08b231a](https://github.com/bazelbuild/rules_nodejs/commit/08b231a))
* **typescript:** include transitive_declarations ([bbcfcdd](https://github.com/bazelbuild/rules_nodejs/commit/bbcfcdd))


### Features

* **builtin:** e2e tests for symlinked node_modules and hide-bazel-files ([8cafe43](https://github.com/bazelbuild/rules_nodejs/commit/8cafe43))
* **create:** add a .gitignore file in new workspaces ([#849](https://github.com/bazelbuild/rules_nodejs/issues/849)) ([3c05167](https://github.com/bazelbuild/rules_nodejs/commit/3c05167))
* **create:** add hide-bazel-files to @bazel/create ([03b7dae](https://github.com/bazelbuild/rules_nodejs/commit/03b7dae))
* implicit hide-bazel-files ([1a8175d](https://github.com/bazelbuild/rules_nodejs/commit/1a8175d))

# [2.0.0](https://github.com/bazelbuild/rules_nodejs/compare/2.0.0-rc.3...2.0.0) (2020-07-20)


### Bug Fixes

* **typescript:** exclude package.json from tsconfig#files ([16cbc6f](https://github.com/bazelbuild/rules_nodejs/commit/16cbc6f))
* **typescript:** include package.json in third-party DeclarationInfo ([1c70656](https://github.com/bazelbuild/rules_nodejs/commit/1c70656)), closes [#2044](https://github.com/bazelbuild/rules_nodejs/issues/2044)


### Features

* **typescript:** support for declarationdir on ts_project  ([#2048](https://github.com/bazelbuild/rules_nodejs/issues/2048)) ([981e7c1](https://github.com/bazelbuild/rules_nodejs/commit/981e7c1))



# [2.0.0-rc.3](https://github.com/bazelbuild/rules_nodejs/compare/2.0.0-rc.2...2.0.0-rc.3) (2020-07-17)


### Bug Fixes

* **builtin:** linker fix for when not running in execroot ([b187d50](https://github.com/bazelbuild/rules_nodejs/commit/b187d50))
* **builtin:** perform the ts-to-js entry_point rewrite ([8cc044f](https://github.com/bazelbuild/rules_nodejs/commit/8cc044f))


### chore

* remove ts_setup_workspace ([07d9bb8](https://github.com/bazelbuild/rules_nodejs/commit/07d9bb8)), closes [/github.com/bazelbuild/rules_nodejs/pull/1159/files#diff-fe375cd73fb89504b9b9a9a751518849](https://github.com//github.com/bazelbuild/rules_nodejs/pull/1159/files/issues/diff-fe375cd73fb89504b9b9a9a751518849) [#2033](https://github.com/bazelbuild/rules_nodejs/issues/2033)


### Features

* **examples:** add a vanilla cra app ([b7bdab7](https://github.com/bazelbuild/rules_nodejs/commit/b7bdab7))
* **examples:** convert create-react-app example to bazel run ([a8ff872](https://github.com/bazelbuild/rules_nodejs/commit/a8ff872))
* **examples:** convert create-react-app example to bazel test ([146e522](https://github.com/bazelbuild/rules_nodejs/commit/146e522))
* **examples:** show the create-react-app converted to bazel build ([52455e0](https://github.com/bazelbuild/rules_nodejs/commit/52455e0))
* **typescript:** support for rootdir on ts_project ([bc88536](https://github.com/bazelbuild/rules_nodejs/commit/bc88536))
* add depset support to run_node inputs, matching ctx.action.run ([ee584f8](https://github.com/bazelbuild/rules_nodejs/commit/ee584f8))


### BREAKING CHANGES

* ts_setup_workspace was a no-op and has been removed. Simply remove it from your WORKSPACE file.



# [2.0.0-rc.2](https://github.com/bazelbuild/rules_nodejs/compare/2.0.0-rc.1...2.0.0-rc.2) (2020-07-10)


### Bug Fixes

* **builtin:** fix node patches subprocess sandbox propogation ([#2017](https://github.com/bazelbuild/rules_nodejs/issues/2017)) ([0bd9b7e](https://github.com/bazelbuild/rules_nodejs/commit/0bd9b7e))



# [2.0.0-rc.1](https://github.com/bazelbuild/rules_nodejs/compare/2.0.0-rc.0...2.0.0-rc.1) (2020-07-06)


### Bug Fixes

* **builtin:** fix linker bug when there are no third-party modules ([becd9bc](https://github.com/bazelbuild/rules_nodejs/commit/becd9bc))
* **builtin:** fixes nodejs_binary to collect JSNamedModuleInfo ([4f95cc4](https://github.com/bazelbuild/rules_nodejs/commit/4f95cc4)), closes [#1998](https://github.com/bazelbuild/rules_nodejs/issues/1998)
* **builtin:** linker silently not generating expected links in windows ([2979fad](https://github.com/bazelbuild/rules_nodejs/commit/2979fad))
* **typescript:** add .proto files from npm deps to inputs of ts_library ([#1991](https://github.com/bazelbuild/rules_nodejs/issues/1991)) ([c1d4885](https://github.com/bazelbuild/rules_nodejs/commit/c1d4885))
* **typescript:** add json to ts_project DefaultInfo, fix [#1988](https://github.com/bazelbuild/rules_nodejs/issues/1988) ([f6fa264](https://github.com/bazelbuild/rules_nodejs/commit/f6fa264))
* **typescript:** Exclude .json from _out_paths ([91d81b3](https://github.com/bazelbuild/rules_nodejs/commit/91d81b3))
* allow multiple run_node calls to be made from the same rule context ([48bb9cc](https://github.com/bazelbuild/rules_nodejs/commit/48bb9cc))


### Features

* add support for capturing and overriding the exit code within run_node ([#1990](https://github.com/bazelbuild/rules_nodejs/issues/1990)) ([cbdd3b0](https://github.com/bazelbuild/rules_nodejs/commit/cbdd3b0))
* **cypress:** add cypress_web_test rule and @bazel/cypress package ([3bac870](https://github.com/bazelbuild/rules_nodejs/commit/3bac870))
* **typescript:** add OutputGroupInfo to ts_project with type definitions ([d660ca1](https://github.com/bazelbuild/rules_nodejs/commit/d660ca1)), closes [#1978](https://github.com/bazelbuild/rules_nodejs/issues/1978)



# [2.0.0-rc.0](https://github.com/bazelbuild/rules_nodejs/compare/1.6.0...2.0.0-rc.0) (2020-06-23)


### Bug Fixes

* **builtin:** fix linker common path reduction bug where reduced path conflicts with node_modules ([65d6029](https://github.com/bazelbuild/rules_nodejs/commit/65d6029))
* **builtin:** fix linker issue when running test with "local" tag on osx & linux ([#1835](https://github.com/bazelbuild/rules_nodejs/issues/1835)) ([98d3321](https://github.com/bazelbuild/rules_nodejs/commit/98d3321))
* **builtin:** fix regression in 1.6.0 in linker linking root package when under runfiles ([b4149d8](https://github.com/bazelbuild/rules_nodejs/commit/b4149d8)), closes [#1823](https://github.com/bazelbuild/rules_nodejs/issues/1823) [#1850](https://github.com/bazelbuild/rules_nodejs/issues/1850)
* **builtin:** linker no longer makes node_modules symlink to the root of the workspace output tree ([044495c](https://github.com/bazelbuild/rules_nodejs/commit/044495c))
* **builtin:** rerun yarn_install and npm_install when node version changes ([8c1e035](https://github.com/bazelbuild/rules_nodejs/commit/8c1e035))
* **builtin:** scrub node-patches VERBOSE_LOGS when asserting on stderr ([45f9443](https://github.com/bazelbuild/rules_nodejs/commit/45f9443))
* **labs:** handle const/let syntax in generated protoc js ([96a0690](https://github.com/bazelbuild/rules_nodejs/commit/96a0690))
* **labs:** make grpc service files tree shakable ([a3bd81b](https://github.com/bazelbuild/rules_nodejs/commit/a3bd81b))
* don't expose an npm dependency from builtin ([7b2b4cf](https://github.com/bazelbuild/rules_nodejs/commit/7b2b4cf))
* **terser:** allow fallback binary resolution ([3ffb3b1](https://github.com/bazelbuild/rules_nodejs/commit/3ffb3b1))


### chore

* remove hide-build-files package ([5d1d006](https://github.com/bazelbuild/rules_nodejs/commit/5d1d006)), closes [#1613](https://github.com/bazelbuild/rules_nodejs/issues/1613)


### Code Refactoring

* remove install_source_map_support from nodejs_binary since it is vendored in ([72f19e7](https://github.com/bazelbuild/rules_nodejs/commit/72f19e7))


### Features

* add JSModuleInfo provider ([d3fcf85](https://github.com/bazelbuild/rules_nodejs/commit/d3fcf85))
* **angular:** introduce an Angular CLI builder ([c87c83f](https://github.com/bazelbuild/rules_nodejs/commit/c87c83f))
* **jasmine:** make jasmine a peerDep ([e6890fc](https://github.com/bazelbuild/rules_nodejs/commit/e6890fc))
* add stdout capture to npm_package_bin ([3f182f0](https://github.com/bazelbuild/rules_nodejs/commit/3f182f0))
* **builtin:** add DeclarationInfo to js_library ([2b89f32](https://github.com/bazelbuild/rules_nodejs/commit/2b89f32))
* introduce generated_file_test ([3fbf2c0](https://github.com/bazelbuild/rules_nodejs/commit/3fbf2c0)), closes [#1893](https://github.com/bazelbuild/rules_nodejs/issues/1893)
* **builtin:** enable coverage on nodejs_test ([2059ea9](https://github.com/bazelbuild/rules_nodejs/commit/2059ea9))
* **builtin:** use linker for all generated :bin targets ([007a8f6](https://github.com/bazelbuild/rules_nodejs/commit/007a8f6))
* **examples:** show how to use ts_library(use_angular_plugin) with worker mode ([#1839](https://github.com/bazelbuild/rules_nodejs/issues/1839)) ([a167311](https://github.com/bazelbuild/rules_nodejs/commit/a167311))
* **examples:** upgrade rules_docker to 0.14.1 ([ad2eba1](https://github.com/bazelbuild/rules_nodejs/commit/ad2eba1))
* **rollup:** update the peerDependencies version range to >=2.3.0 <3.0.0 ([e05f5be](https://github.com/bazelbuild/rules_nodejs/commit/e05f5be))
* **typescript:** add outdir to ts_project ([3942fd9](https://github.com/bazelbuild/rules_nodejs/commit/3942fd9))
* **typescript:** include label in the ts_project progress message ([#1944](https://github.com/bazelbuild/rules_nodejs/issues/1944)) ([76e8bd1](https://github.com/bazelbuild/rules_nodejs/commit/76e8bd1)), closes [#1927](https://github.com/bazelbuild/rules_nodejs/issues/1927)
* support bazel+js packages that install into regular @npm//package:index.bzl location ([4f508b1](https://github.com/bazelbuild/rules_nodejs/commit/4f508b1))


### BREAKING CHANGES

* Adds JSModuleInfo provider as the common provider for passing & consuming javascript sources and related files such as .js.map, .json, etc.

For 1.0 we added JSNamedModuleInfo and JSEcmaScriptModuleInfo which were provided by ts_library and consumed by rules that needed to differentiate between the two default flavors of ts_library outputs (named-UMD & esm). We left out JSModuleInfo as its use case was unclear at the time.

For 2.0 we're adding JSModuleInfo as generic javascript provided for the rules_nodejs ecosystem. It is not currently opinionated about the module format of the sources or the language level. Consumers of JSModuleInfo should be aware of what module format & language level is being produced if necessary.

The following rules provide JSModuleInfo:

* ts_library (devmode named-UMD .js output flavor)
* ts_proto_library (devmode named-UMD .js output flavor)
* node_module_library (this is a behind the scenes rule used by yarn_install & npm_install)
* js_library (.js, .js.map & . json files)
* rollup_bundle
* terser_minfied
* ts_project

The following rules consume JSModuleInfo:

* nodejs_binary & nodejs_test (along with derivate macros such as jasmine_node_test); these rules no longer consume JSNamedModuleInfo
* npm_package_bin
* pkg_npm; no longer consumes JSNamedModuleInfo
* karma_web_test (for config file instead of JSNamedModuleInfo; JSNamedModuleInfo still used for test files)
* protractor_web_test (for config & on_prepare files instead of JSModuleInfo; JSNamedModuleInfo still used for test files)
* rollup_bundle (if JSEcmaScriptModuleInfo not provided)
* terser_minified
* **builtin:** Any nodejs_binary/nodejs_test processes with the linker enabled (--nobazel_patch_module_resolver is set) that were relying on standard node_module resolution to resolve manfest file paths such as `my_workspace/path/to/output/file.js` must now use the runfiles helper such as.

Previously:
```
const absPath = require.resolve('my_workspace/path/to/output/file.js');
```
With runfiles helper:
```
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const absPath = runfiles.resolve('my_workspace/path/to/output/file.js');
```
* **builtin:** Removed provide_declarations() factory function for DeclarationInfo. Use declaration_info() factory function instead.
* `install_source_map_support` attribute removed from `nodejs_binary`. `source-map-support` is vendored in at `/third_party/github.com/source-map-support` so it can always be installed.
* **builtin:** jasmine_node_test not longer has the `coverage`
attribute
* rules_nodejs now requires Bazel 2.1 or greater.
Also the hide_build_files attribute was removed from pkg_npm, and always_hide_bazel_files was removed from yarn_install and npm_install. These are no longer needed since 1.3.0
* **builtin:** If you use the generated nodejs_binary or nodejs_test rules in the npm
workspace, for example @npm//typescript/bin:tsc, your custom rule must now link the
node_modules directory into that process. A typical way to do this is
with the run_node helper. See updates to examples in this commit.



# [1.6.0](https://github.com/bazelbuild/rules_nodejs/compare/1.5.0...1.6.0) (2020-04-11)


### Features

* **builtin:** export version to npm/yarn install ([011278e](https://github.com/bazelbuild/rules_nodejs/commit/011278e))
* **jasmine:** check pkg version to rules_nodejs ([22bebbc](https://github.com/bazelbuild/rules_nodejs/commit/22bebbc))
* **typescript:** wire up use_angular_plugin attribute ([520493d](https://github.com/bazelbuild/rules_nodejs/commit/520493d))


### Bug Fixes

* **builtin:** always symlink node_modules at `execroot/my_wksp/node_modules` even when running in runfiles ([#1805](https://github.com/bazelbuild/rules_nodejs/issues/1805)) ([5c2f6c1](https://github.com/bazelbuild/rules_nodejs/commit/5c2f6c1))
* **builtin:** don't allow symlinks to escape or enter bazel managed node_module folders ([#1800](https://github.com/bazelbuild/rules_nodejs/issues/1800)) ([4554ce7](https://github.com/bazelbuild/rules_nodejs/commit/4554ce7))
* **builtin:** fix for pkg_npm single directory artifact dep case ([5a7c1a7](https://github.com/bazelbuild/rules_nodejs/commit/5a7c1a7))
* **builtin:** fix node patches lstat short-circuit logic ([#1818](https://github.com/bazelbuild/rules_nodejs/issues/1818)) ([b0627be](https://github.com/bazelbuild/rules_nodejs/commit/b0627be))
* **builtin:** fix npm_version_check.js when running outside of bazel ([#1802](https://github.com/bazelbuild/rules_nodejs/issues/1802)) ([afabe89](https://github.com/bazelbuild/rules_nodejs/commit/afabe89))
* **builtin:** look in the execroot for nodejs_binary source entry_points ([#1816](https://github.com/bazelbuild/rules_nodejs/issues/1816)) ([b84d65e](https://github.com/bazelbuild/rules_nodejs/commit/b84d65e)), closes [#1787](https://github.com/bazelbuild/rules_nodejs/issues/1787) [#1787](https://github.com/bazelbuild/rules_nodejs/issues/1787)
* **builtin:** preserve lone $ in templated_args for legacy support ([#1772](https://github.com/bazelbuild/rules_nodejs/issues/1772)) ([72c14d8](https://github.com/bazelbuild/rules_nodejs/commit/72c14d8))
* **builtin:** under runfiles linker should link node_modules folder at root of runfiles tree ([13510ad](https://github.com/bazelbuild/rules_nodejs/commit/13510ad))
* **rollup:** fix worker not picking up config file changes ([a19eb2b](https://github.com/bazelbuild/rules_nodejs/commit/a19eb2b)), closes [#1790](https://github.com/bazelbuild/rules_nodejs/issues/1790)
* **typescript:** don't mix worker mode and linker ([55c6c4a](https://github.com/bazelbuild/rules_nodejs/commit/55c6c4a)), closes [#1803](https://github.com/bazelbuild/rules_nodejs/issues/1803) [#1803](https://github.com/bazelbuild/rules_nodejs/issues/1803)
* **typescript:** include extended tsconfigs in _TsConfigInfo ([cd8520d](https://github.com/bazelbuild/rules_nodejs/commit/cd8520d)), closes [#1754](https://github.com/bazelbuild/rules_nodejs/issues/1754)


### Examples

* **examples:** add support for server side rendering with universal ([c09ca89](https://github.com/bazelbuild/rules_nodejs/commit/c09ca89))
* **examples:** build and consume an Angular workspace library  ([#1633](https://github.com/bazelbuild/rules_nodejs/issues/1633)) ([b459d6d](https://github.com/bazelbuild/rules_nodejs/commit/b459d6d))


### Documentation

* **docs:** `yarn_urls` should be `string_list`, not `string` ([3357c08](https://github.com/bazelbuild/rules_nodejs/commit/3357c08))


# [1.5.0](https://github.com/bazelbuild/rules_nodejs/compare/1.4.1...1.5.0) (2020-03-28)


### Bug Fixes

* **builtin:** entry point of a .tsx file is .js ([#1732](https://github.com/bazelbuild/rules_nodejs/issues/1732)) ([24607ed](https://github.com/bazelbuild/rules_nodejs/commit/24607ed)), closes [#1730](https://github.com/bazelbuild/rules_nodejs/issues/1730)
* **builtin:** fix for nodejs_binary entry point in bazel-out logic ([#1739](https://github.com/bazelbuild/rules_nodejs/issues/1739)) ([a6e29c2](https://github.com/bazelbuild/rules_nodejs/commit/a6e29c2)) ([863c7de](https://github.com/bazelbuild/rules_nodejs/commit/863c7de))
closes [#1606](https://github.com/bazelbuild/rules_nodejs/issues/1606)
* **jasmine:** user templated_args should be passed to jasmine after 3 internal templated_args ([#1743](https://github.com/bazelbuild/rules_nodejs/issues/1743)) ([baa68c1](https://github.com/bazelbuild/rules_nodejs/commit/baa68c1))
* **typescript:** fix ts_library to allow deps with module_name but no module_root attrs ([#1738](https://github.com/bazelbuild/rules_nodejs/issues/1738)) ([0b5ad2a](https://github.com/bazelbuild/rules_nodejs/commit/0b5ad2a))
* **typescript:** pass rootDir to ts_project tsc actions ([#1748](https://github.com/bazelbuild/rules_nodejs/issues/1748)) ([13caf8b](https://github.com/bazelbuild/rules_nodejs/commit/13caf8b))


### Features

* **builtin:** add LinkablePackageInfo to pkg_npm, js_library & ts_library ([1023852](https://github.com/bazelbuild/rules_nodejs/commit/1023852))
* **builtin:** add support for predefined variables and custom variable to params_file ([34b8cf4](https://github.com/bazelbuild/rules_nodejs/commit/34b8cf4))
* **builtin:** support $(rootpath), $(execpath), predefined & custom variables in templated_args ([5358d56](https://github.com/bazelbuild/rules_nodejs/commit/5358d56))
* **labs:** introduce a new ts_proto_library with grpc support ([8b43896](https://github.com/bazelbuild/rules_nodejs/commit/8b43896))
* **rollup:** add worker support to rollup_bundle ([66db579](https://github.com/bazelbuild/rules_nodejs/commit/66db579))
* **typescript:** add devmode_target, devmode_module, prodmode_target & prodmode_module attributes ([#1687](https://github.com/bazelbuild/rules_nodejs/issues/1687)) ([1a83a7f](https://github.com/bazelbuild/rules_nodejs/commit/1a83a7f))
* **typescript:** add ts_project rule ([#1710](https://github.com/bazelbuild/rules_nodejs/issues/1710)) ([26f6698](https://github.com/bazelbuild/rules_nodejs/commit/26f6698))


### Examples

* **examples:** fix angular examples prod serve doesn't work on windows ([#1699](https://github.com/bazelbuild/rules_nodejs/issues/1699)) ([063fb13](https://github.com/bazelbuild/rules_nodejs/commit/063fb13)), 


### Documentation

* **docs:** invalid link of examples ([#1728](https://github.com/bazelbuild/rules_nodejs/issues/1728)) ([7afaa48](https://github.com/bazelbuild/rules_nodejs/commit/7afaa48))
* **docs:** syntax error in example code ([#1731](https://github.com/bazelbuild/rules_nodejs/issues/1731)) ([51785e5](https://github.com/bazelbuild/rules_nodejs/commit/51785e5))
* **docs:** invalid link in index ([b47cc74](https://github.com/bazelbuild/rules_nodejs/commit/b47cc74))

## [1.4.1](https://github.com/bazelbuild/rules_nodejs/compare/1.4.0...1.4.1) (2020-03-06)

### Bug Fixes

* **builtin:** Bazel build failing when project is not on the system drive on Windows (C:) ([#1641](https://github.com/bazelbuild/rules_nodejs/issues/1641)) ([d9cbb99f](https://github.com/bazelbuild/rules_nodejs/commit/d9cbb99f)
* **windows_utils:** Escaping \ and " before passing args to bash scrip… ([#1685](https://github.com/bazelbuild/rules_nodejs/pull/1685)) ([f9be953d](https://github.com/bazelbuild/rules_nodejs/commit/f9be953d)


# [1.4.0](https://github.com/bazelbuild/rules_nodejs/compare/1.3.0...1.4.0) (2020-03-02)


### Bug Fixes

* **builtin:** don't include external files when pkg_npm is in root package ([#1677](https://github.com/bazelbuild/rules_nodejs/issues/1677)) ([8089999](https://github.com/bazelbuild/rules_nodejs/commit/8089999)), closes [#1499](https://github.com/bazelbuild/rules_nodejs/issues/1499)
* **examples:** change build target label to //src:prodapp ([a7f07d1](https://github.com/bazelbuild/rules_nodejs/commit/a7f07d1))
* **examples:** fix angular examples to use bazelisk ([02e6462](https://github.com/bazelbuild/rules_nodejs/commit/02e6462))
* ensure BAZEL_NODE_RUNFILES_HELPER & BAZEL_NODE_PATCH_REQUIRE are absolute ([#1634](https://github.com/bazelbuild/rules_nodejs/issues/1634)) ([25600ea](https://github.com/bazelbuild/rules_nodejs/commit/25600ea))
* expand_variables helper should handle external labels ([3af3a0d](https://github.com/bazelbuild/rules_nodejs/commit/3af3a0d))
* logic error in expand_variables ([#1631](https://github.com/bazelbuild/rules_nodejs/issues/1631)) ([32c003f](https://github.com/bazelbuild/rules_nodejs/commit/32c003f))
* yarn cache path should be a string ([#1679](https://github.com/bazelbuild/rules_nodejs/issues/1679)) ([a43809b](https://github.com/bazelbuild/rules_nodejs/commit/a43809b))
* **builtin:** use posix paths in assembler ([d635dca](https://github.com/bazelbuild/rules_nodejs/commit/d635dca)), closes [#1635](https://github.com/bazelbuild/rules_nodejs/issues/1635)
* **create:** use latest typescript ([a8ba18e](https://github.com/bazelbuild/rules_nodejs/commit/a8ba18e)), closes [#1602](https://github.com/bazelbuild/rules_nodejs/issues/1602)
* **examples:** add fixes to angular architect ([f6f40c3](https://github.com/bazelbuild/rules_nodejs/commit/f6f40c3))
* remove empty arguments from launcher ([#1650](https://github.com/bazelbuild/rules_nodejs/issues/1650)) ([aa3cd6c](https://github.com/bazelbuild/rules_nodejs/commit/aa3cd6c))


### Features

* **@bazel/jasmine:** update dependencies to jasmine v3.5.0 ([98fab93](https://github.com/bazelbuild/rules_nodejs/commit/98fab93))
* **docs:** add authroing instructions ([4dde728](https://github.com/bazelbuild/rules_nodejs/commit/4dde728))
* **docs:** add header anchor links ([2002046](https://github.com/bazelbuild/rules_nodejs/commit/2002046))
* **docs:** add vscode debugging section ([78d308f](https://github.com/bazelbuild/rules_nodejs/commit/78d308f))
* **examples:** add serve to angular architect ([1569f4b](https://github.com/bazelbuild/rules_nodejs/commit/1569f4b))
* **jasmine:** configure XML reporter to capture detailed testlogs ([8abd20d](https://github.com/bazelbuild/rules_nodejs/commit/8abd20d))
* **rollup:** add `args` attribute to rollup_bundle rule ([#1681](https://github.com/bazelbuild/rules_nodejs/issues/1681)) ([94c6182](https://github.com/bazelbuild/rules_nodejs/commit/94c6182))
* **rollup:** add silent attr to rollup_bundle to support --silent flag ([#1680](https://github.com/bazelbuild/rules_nodejs/issues/1680)) ([18e8001](https://github.com/bazelbuild/rules_nodejs/commit/18e8001))
* **typescript:** use run_node helper to execute tsc ([066a52c](https://github.com/bazelbuild/rules_nodejs/commit/066a52c))



# [1.3.0](https://github.com/bazelbuild/rules_nodejs/compare/1.2.4...1.3.0) (2020-02-07)


### Bug Fixes

* **builtin:** strip leading v prefix from stamp ([#1591](https://github.com/bazelbuild/rules_nodejs/issues/1591)) ([39bb821](https://github.com/bazelbuild/rules_nodejs/commit/39bb821))
* angular example ts_scripts path in Windows ([30d0f37](https://github.com/bazelbuild/rules_nodejs/commit/30d0f37)), closes [#1604](https://github.com/bazelbuild/rules_nodejs/issues/1604)
* html script injection is broken on windows ([7f7a45b](https://github.com/bazelbuild/rules_nodejs/commit/7f7a45b)), closes [#1604](https://github.com/bazelbuild/rules_nodejs/issues/1604)
* unset YARN_IGNORE_PATH before calling yarn in [@nodejs](https://github.com/nodejs) targets ([aee3003](https://github.com/bazelbuild/rules_nodejs/commit/aee3003)), closes [#1588](https://github.com/bazelbuild/rules_nodejs/issues/1588)


### Features

* **builtin:** add environment attribute to yarn_install & npm_install ([#1596](https://github.com/bazelbuild/rules_nodejs/issues/1596)) ([87b2a64](https://github.com/bazelbuild/rules_nodejs/commit/87b2a64))
* **builtin:** expose `@npm//foo__all_files` filegroup that includes all files in the npm package ([#1600](https://github.com/bazelbuild/rules_nodejs/issues/1600)) ([8d77827](https://github.com/bazelbuild/rules_nodejs/commit/8d77827))
* **examples:** add protractor angular architect ([#1594](https://github.com/bazelbuild/rules_nodejs/issues/1594)) ([d420019](https://github.com/bazelbuild/rules_nodejs/commit/d420019))



## [1.2.4](https://github.com/bazelbuild/rules_nodejs/compare/1.2.2...1.2.4) (2020-01-31)


### Bug Fixes

* **builtin:** fix logic error in linker conflict resolution ([#1597](https://github.com/bazelbuild/rules_nodejs/issues/1597)) ([b864223](https://github.com/bazelbuild/rules_nodejs/commit/b864223))



## [1.2.2](https://github.com/bazelbuild/rules_nodejs/compare/1.2.1...1.2.2) (2020-01-31)


### Bug Fixes

* unset YARN_IGNORE_PATH in yarn_install before calling yarn ([5a2af71](https://github.com/bazelbuild/rules_nodejs/commit/5a2af71))
* fixes bazelbuild/rules_nodejs#1567 Recursively copy files from subdirectories into mirrored structure in the npm archive ([c83b026](https://github.com/bazelbuild/rules_nodejs/commit/c83b026))


### Code Refactoring

* Replace grep with bash's regex operator ([9fb080b](https://github.com/bazelbuild/rules_nodejs/commit/9fb080b))


### Examples

* enable test file crawling for jest example ([8854bfd](https://github.com/bazelbuild/rules_nodejs/commit/8854bfd))
* add angular bazel architect ([6dc919d](https://github.com/bazelbuild/rules_nodejs/commit/6dc919d))



## [1.2.1](https://github.com/bazelbuild/rules_nodejs/compare/1.2.0...1.2.1) (2020-01-30)


### Bug Fixes

* allow "src" and "bin" module mappings to win over "runfiles" ([110e00e](https://github.com/bazelbuild/rules_nodejs/commit/110e00e))
* also link "runfiles" mappings from *_test rules ([79bedc5](https://github.com/bazelbuild/rules_nodejs/commit/79bedc5))
* osx hide-bazel-files issue with fsevents ([#1578](https://github.com/bazelbuild/rules_nodejs/issues/1578)) ([64a31ab](https://github.com/bazelbuild/rules_nodejs/commit/64a31ab))
* yarn_install failure if yarn is a dependency ([#1581](https://github.com/bazelbuild/rules_nodejs/issues/1581)) ([f712377](https://github.com/bazelbuild/rules_nodejs/commit/f712377))



# [1.2.0](https://github.com/bazelbuild/rules_nodejs/compare/1.1.0...1.2.0) (2020-01-24)


### Bug Fixes

* **builtin:** legacy module_mappings_runtime_aspect handles dep with module_name but no module_root ([9ac0534](https://github.com/bazelbuild/rules_nodejs/commit/9ac0534))
* **builtin:** nodejs_binary collects module_mappings for linker ([4419f95](https://github.com/bazelbuild/rules_nodejs/commit/4419f95))
* **builtin:** set cwd before running yarn for yarn_install ([#1569](https://github.com/bazelbuild/rules_nodejs/issues/1569)) ([d7083ac](https://github.com/bazelbuild/rules_nodejs/commit/d7083ac))


### Features

* **builtin:** add configuration_env_vars to npm_package_bin ([07d9f5d](https://github.com/bazelbuild/rules_nodejs/commit/07d9f5d))



# [1.1.0](https://github.com/bazelbuild/rules_nodejs/compare/1.0.1...1.1.0) (2020-01-12)


### Bug Fixes

* separate nodejs require patches from loader and —require them first ([b10d230](https://github.com/bazelbuild/rules_nodejs/commit/b10d230))
* **karma:** pass --node_options to karma ([d48f237](https://github.com/bazelbuild/rules_nodejs/commit/d48f237))
* **protractor:** pass --node_options to protractor ([a3b39ab](https://github.com/bazelbuild/rules_nodejs/commit/a3b39ab))


### Features

* **builtin:** add support for Predefined variables and Custom variable to npm_package_bin ([34176e5](https://github.com/bazelbuild/rules_nodejs/commit/34176e5))
* **examples:** add nestjs test ([f448931](https://github.com/bazelbuild/rules_nodejs/commit/f448931))
* **examples:** add nodejs_binary cluster example ([#1515](https://github.com/bazelbuild/rules_nodejs/issues/1515)) ([f217519](https://github.com/bazelbuild/rules_nodejs/commit/f217519))



## [1.0.1](https://github.com/bazelbuild/rules_nodejs/compare/1.0.0...1.0.1) (2020-01-03)


### Bug Fixes

* don't bake COMPILATION_MODE into launcher as exported environment var ([8a931d8](https://github.com/bazelbuild/rules_nodejs/commit/8a931d8))
* **builtin:** make .pack and .publish targets work again ([43716d3](https://github.com/bazelbuild/rules_nodejs/commit/43716d3)), closes [#1493](https://github.com/bazelbuild/rules_nodejs/issues/1493)
* **create:** @bazel/create should verbose log based on VERBOSE_LOGS instead of COMPILATION_MODE ([c1b97d6](https://github.com/bazelbuild/rules_nodejs/commit/c1b97d6))


### Features

* **builtin:** allow patching require in bootstrap scripts ([842dfb4](https://github.com/bazelbuild/rules_nodejs/commit/842dfb4))



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

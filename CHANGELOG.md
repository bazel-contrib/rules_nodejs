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

# [0.37.0](https://github.com/alexeagle/rules_nodejs/compare/0.36.2...0.37.0) (2019-09-06)


### Bug Fixes

* **builtin:** --nolegacy_external_runfiles on build ([38814aa](https://github.com/alexeagle/rules_nodejs/commit/38814aa))
* **builtin:** fix localWorkspacePath logic ([0a7fb01](https://github.com/alexeagle/rules_nodejs/commit/0a7fb01)), closes [#1087](https://github.com/alexeagle/rules_nodejs/issues/1087)
* **npm_install:** dynamic_deps attribute not working for scoped packages ([bf68577](https://github.com/alexeagle/rules_nodejs/commit/bf68577))
* node executables not running on windows if bash toolchain path ([#1104](https://github.com/alexeagle/rules_nodejs/issues/1104)) ([c82b43d](https://github.com/alexeagle/rules_nodejs/commit/c82b43d))
* node_loader windows fix for RUNFILES_MANIFEST_FILE slashes ([d3886ce](https://github.com/alexeagle/rules_nodejs/commit/d3886ce))


### chore

* remove tsc_wrapped_deps compatibility ([#1100](https://github.com/alexeagle/rules_nodejs/issues/1100)) ([5e98bda](https://github.com/alexeagle/rules_nodejs/commit/5e98bda)), closes [#1086](https://github.com/alexeagle/rules_nodejs/issues/1086)


### Features

* add default DEBUG and VERBOSE_LOGS configuration_env_vars to nodejs_binary ([#1080](https://github.com/alexeagle/rules_nodejs/issues/1080)) ([df37fca](https://github.com/alexeagle/rules_nodejs/commit/df37fca))
* **builtin:** add Kotlin example ([0912014](https://github.com/alexeagle/rules_nodejs/commit/0912014))
* **builtin:** introduce a linker ([62037c9](https://github.com/alexeagle/rules_nodejs/commit/62037c9))


### BREAKING CHANGES

* A compatibility layer was removed. See discussion in https://github.com/bazelbuild/rules_nodejs/issues/1086



## [0.36.2](https://github.com/alexeagle/rules_nodejs/compare/0.36.1...0.36.2) (2019-08-30)


### Bug Fixes

* account for breaking path change in new chromedriver distro ([d8a0ccb](https://github.com/alexeagle/rules_nodejs/commit/d8a0ccb)), closes [/github.com/bazelbuild/rules_webtesting/commit/62062b4bd111acc8598bfc816e87cda012bdaae6#diff-bb710201187c4ad0a3fbbe941ffc4b0](https://github.com//github.com/bazelbuild/rules_webtesting/commit/62062b4bd111acc8598bfc816e87cda012bdaae6/issues/diff-bb710201187c4ad0a3fbbe941ffc4b0)
* patching rules_webtesting to fix chrome path ([97933d8](https://github.com/alexeagle/rules_nodejs/commit/97933d8))
* **builtin:** reformat the error message for Node loader.js ([67bca8f](https://github.com/alexeagle/rules_nodejs/commit/67bca8f)), closes [/github.com/nodejs/node/blob/a49b20d3245dd2a4d890e28582f3c013c07c3136/lib/internal/modules/cjs/loader.js#L264](https://github.com//github.com/nodejs/node/blob/a49b20d3245dd2a4d890e28582f3c013c07c3136/lib/internal/modules/cjs/loader.js/issues/L264)
* **karma:** error messages truncated due to custom formatter ([f871be6](https://github.com/alexeagle/rules_nodejs/commit/f871be6))
* **typescript:** add peerDependency on typescript ([48c5088](https://github.com/alexeagle/rules_nodejs/commit/48c5088))


### Features

* **builtin:** add a DeclarationInfo provider ([3d7eb13](https://github.com/alexeagle/rules_nodejs/commit/3d7eb13))
* add templated_args_file to allow long agrs to be written to a file ([b34d7bb](https://github.com/alexeagle/rules_nodejs/commit/b34d7bb))
* **builtin:** support yarn --frozen_lockfile ([426861f](https://github.com/alexeagle/rules_nodejs/commit/426861f))
* **terser:** introduce @bazel/terser package ([232acfe](https://github.com/alexeagle/rules_nodejs/commit/232acfe))



## [0.36.1](https://github.com/alexeagle/rules_nodejs/compare/0.36.0...0.36.1) (2019-08-20)


### Features

* **builtin:** add browser to rollup mainFields ([e488cb6](https://github.com/alexeagle/rules_nodejs/commit/e488cb6))
* **builtin:** introduce dynamic dependencies concept ([a47410e](https://github.com/alexeagle/rules_nodejs/commit/a47410e))
* **less:** add less link to the docs's drawer ([ec6e0d1](https://github.com/alexeagle/rules_nodejs/commit/ec6e0d1))
* **less:** new less package ([462f6e9](https://github.com/alexeagle/rules_nodejs/commit/462f6e9))
* **less:** updated default compiler to @bazel/less as mentioned in code review ([fd71f26](https://github.com/alexeagle/rules_nodejs/commit/fd71f26))
* **less:** updated package.json in e2e/less to pull latest ([6027aa3](https://github.com/alexeagle/rules_nodejs/commit/6027aa3))



# [0.36.0](https://github.com/alexeagle/rules_nodejs/compare/0.35.0...0.36.0) (2019-08-15)


### Bug Fixes

* **jasmine:** correct comment about behavior of config_file attr ([59a7239](https://github.com/alexeagle/rules_nodejs/commit/59a7239))
* fix yarn_install yarn cache mutex bug ([31aa1a6](https://github.com/alexeagle/rules_nodejs/commit/31aa1a6))
* get rules_go dependency from build_bazel_rules_typescript ([ea6ee0b](https://github.com/alexeagle/rules_nodejs/commit/ea6ee0b))
* npm_package issue with external files on windows ([8679b9e](https://github.com/alexeagle/rules_nodejs/commit/8679b9e))
* sconfig deps sandbox bug ([161693c](https://github.com/alexeagle/rules_nodejs/commit/161693c))


### Features

* **jasmine:** introduce config_file attribute ([b0b2648](https://github.com/alexeagle/rules_nodejs/commit/b0b2648))
* **jasmine_node_test:** add attr `jasmine_config` ([715ffc6](https://github.com/alexeagle/rules_nodejs/commit/715ffc6))
* **worker:** new worker package ([9e26856](https://github.com/alexeagle/rules_nodejs/commit/9e26856))
* add browser module main priority to generated umd bundles ([17cfac9](https://github.com/alexeagle/rules_nodejs/commit/17cfac9))



# [0.35.0](https://github.com/alexeagle/rules_nodejs/compare/0.34.0...0.35.0) (2019-08-02)


### Bug Fixes

* **jasmine:** enforce that jasmine_node_test is loaded from new location ([7708858](https://github.com/alexeagle/rules_nodejs/commit/7708858)), closes [#838](https://github.com/alexeagle/rules_nodejs/issues/838)
* fencing for npm packages ([#946](https://github.com/alexeagle/rules_nodejs/issues/946)) ([780dfb4](https://github.com/alexeagle/rules_nodejs/commit/780dfb4))


### Features

* **builtin:** do code splitting even if only one entry point ([f51c129](https://github.com/alexeagle/rules_nodejs/commit/f51c129))
* **stylus:** add initial stylus rule ([804a788](https://github.com/alexeagle/rules_nodejs/commit/804a788))
* **stylus:** output sourcemap ([dac014a](https://github.com/alexeagle/rules_nodejs/commit/dac014a))
* **stylus:** support import by allowing files in deps ([3987070](https://github.com/alexeagle/rules_nodejs/commit/3987070))


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



# [0.34.0](https://github.com/alexeagle/rules_nodejs/compare/0.33.1...0.34.0) (2019-07-23)


### Bug Fixes

* **builtin:** process/browser should resolve from browserify ([a98eda7](https://github.com/alexeagle/rules_nodejs/commit/a98eda7))
* fix for node windows cross-compile ([001d945](https://github.com/alexeagle/rules_nodejs/commit/001d945)), closes [#909](https://github.com/alexeagle/rules_nodejs/issues/909)
* node runfiles resolution from external workspaces ([82500de](https://github.com/alexeagle/rules_nodejs/commit/82500de))


### Features

* **protractor:** add protractor rule ([35a344c](https://github.com/alexeagle/rules_nodejs/commit/35a344c))



## [0.33.1](https://github.com/alexeagle/rules_nodejs/compare/0.33.0...0.33.1) (2019-07-12)


### Bug Fixes

* **builtin:** include package.json files in browserify inputs ([13c09e6](https://github.com/alexeagle/rules_nodejs/commit/13c09e6))



# [0.33.0](https://github.com/alexeagle/rules_nodejs/compare/0.32.2...0.33.0) (2019-07-12)


### Bug Fixes

* **builtin:** update to latest ncc ([c1e3f4d](https://github.com/alexeagle/rules_nodejs/commit/c1e3f4d)), closes [#771](https://github.com/alexeagle/rules_nodejs/issues/771)
* **builtin:** use a local mod to revert a browserify change ([253e9cb](https://github.com/alexeagle/rules_nodejs/commit/253e9cb))


### Features

* **builtin:** add nodejs toolchain support ([9afb8db](https://github.com/alexeagle/rules_nodejs/commit/9afb8db))



## [0.32.2](https://github.com/alexeagle/rules_nodejs/compare/0.32.1...0.32.2) (2019-06-21)


### Bug Fixes

* **builtin:** add test case for @bazel/hide-bazel-files bug ([2a63ed6](https://github.com/alexeagle/rules_nodejs/commit/2a63ed6))
* **builtin:** always hide bazel files in yarn_install & npm install--- ([0104be7](https://github.com/alexeagle/rules_nodejs/commit/0104be7))



## [0.32.1](https://github.com/alexeagle/rules_nodejs/compare/0.32.0...0.32.1) (2019-06-19)


### Bug Fixes

* **typescript:** exclude typescript lib declarations in ([3d55b41](https://github.com/alexeagle/rules_nodejs/commit/3d55b41))
* **typescript:** remove override of @bazel/tsetse ([2e128ce](https://github.com/alexeagle/rules_nodejs/commit/2e128ce))



# [0.32.0](https://github.com/alexeagle/rules_nodejs/compare/0.31.1...0.32.0) (2019-06-18)


### Bug Fixes

* **builtin:** add @bazel/hide-bazel-files utility ([e7d2fbd](https://github.com/alexeagle/rules_nodejs/commit/e7d2fbd))
* **builtin:** fix for issue 834 ([#847](https://github.com/alexeagle/rules_nodejs/issues/847)) ([c0fe512](https://github.com/alexeagle/rules_nodejs/commit/c0fe512))
* **builtin:** fix for symlinked node_modules issue [#802](https://github.com/alexeagle/rules_nodejs/issues/802) ([43cebe7](https://github.com/alexeagle/rules_nodejs/commit/43cebe7))
* **create:** run ts_setup_workspace in TypeScript workspaces ([c8e61c5](https://github.com/alexeagle/rules_nodejs/commit/c8e61c5))
* **typescript:** fix issue with types[] in non-sandboxed tsc ([08b231a](https://github.com/alexeagle/rules_nodejs/commit/08b231a))
* **typescript:** include transitive_declarations ([bbcfcdd](https://github.com/alexeagle/rules_nodejs/commit/bbcfcdd))


### Features

* **builtin:** e2e tests for symlinked node_modules and hide-bazel-files ([8cafe43](https://github.com/alexeagle/rules_nodejs/commit/8cafe43))
* **create:** add a .gitignore file in new workspaces ([#849](https://github.com/alexeagle/rules_nodejs/issues/849)) ([3c05167](https://github.com/alexeagle/rules_nodejs/commit/3c05167))
* **create:** add hide-bazel-files to @bazel/create ([03b7dae](https://github.com/alexeagle/rules_nodejs/commit/03b7dae))
* implicit hide-bazel-files ([1a8175d](https://github.com/alexeagle/rules_nodejs/commit/1a8175d))




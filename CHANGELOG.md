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




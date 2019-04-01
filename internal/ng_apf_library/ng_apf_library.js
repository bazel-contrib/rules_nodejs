/**
 * @license
 * Copyright 2019 The Bazel Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Returns true if the specified `pkg` conforms to Angular Package Format (APF),
 * false otherwise. If the package contains `*.metadata.json` and a
 * corresponding sibling `.d.ts` file, then the package is considered to be APF.
 */
function isNgApfPackage(pkg) {
  const set = new Set(pkg._files);
  const metadataExt = /\.metadata\.json$/;
  return pkg._files.some((file) => {
    if (metadataExt.test(file)) {
      const sibling = file.replace(metadataExt, '.d.ts');
      if (set.has(sibling)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Prints a `ng_apf_library` rule that replaces the generated filegroup target
 * that the user will depend on, e.g. `@npm//@angular/core` will be an
 * `ng_apf_library`.
 */
function printNgApfLibrary(pkg, pkgDeps) {
  return `
load("@build_bazel_rules_nodejs//internal/ng_apf_library:ng_apf_library.bzl", "ng_apf_library")
ng_apf_library(
    name = "${pkg._name}__pkg",
    srcs = [
        # ${pkg._dir} package contents (and contents of nested node_modules)
        ":${pkg._name}__files",
    ],
    deps = [
        # direct or transitive dependencies hoisted to root by the package manager
        ${pkgDeps.map(dep => `"//node_modules/${dep._dir}:${dep._name}__pkg",`).join('\n        ')}
    ],
    tags = ["NODE_MODULE_MARKER"],
)
`;
}

module.exports = {
  isNgApfPackage,
  printNgApfLibrary,
}

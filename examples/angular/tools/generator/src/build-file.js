
const fs = require('fs');

module.exports.writeModuleBuildFile =
    function writeModuleBuildFile(file, {modIdx, scssFileAcc, tsFileAcc, htmlFileAcc}) {
  fs.writeFileSync(
      file,
      // Make Buildifier happy, don't format line below.
      `# Generated BUILD file, see /tools/generator
load("@io_bazel_rules_sass//:defs.bzl", "sass_binary")
load("@npm_angular_bazel//:index.bzl", "ng_module")
load("@npm_bazel_typescript//:defs.bzl", "ts_library")
load("//tools:defaults.bzl", "ts_web_test_suite")

package(default_visibility = ["//:__subpackages__"])

${
          scssFileAcc
              .map(
                  (s, idx) =>
                      // Make Buildifier happy, don't format line below.
                  `sass_binary(
    name = "module${idx}_styles",
    src = "${s}",
)`).join('\n\n')}

# We don't import from these, but the generated ngfactory code will
NG_FACTORY_ADDED_IMPORTS = [
    "@npm//@angular/cdk",
    "@npm//@angular/material",
    "@npm//@angular/forms",
]

ng_module(
    name = "module${modIdx}",
    srcs = [
        ${tsFileAcc.map(s => `"${s}"`).join(',\n        ')},
        "module${modIdx}.module.ts",
    ],
    assets = [
        ${scssFileAcc.map((_, idx) => `":module${idx}_styles"`).join(`,\n        `)},
        ${htmlFileAcc.map(s => `"${s}"`).join(',\n        ')},
    ],
    tsconfig = "//src:tsconfig.json",
    deps = [
        "@npm//@angular/common",
        "@npm//@angular/core",
        "//src/shared/material",
    ] + NG_FACTORY_ADDED_IMPORTS,
)

ts_library(
    name = "test_lib",
    testonly = 1,
    srcs = glob(["**/*.spec.ts"]),
    tsconfig = "//src:tsconfig-test",
    deps = [
        ":module${modIdx}",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@angular/platform-browser-dynamic",
        "@npm//@types/jasmine",
        "@npm//@types/node",
    ] + NG_FACTORY_ADDED_IMPORTS,
)

ts_web_test_suite(
    name = "test",
    # do not sort
    bootstrap = [
        "@npm//:node_modules/zone.js/dist/zone-testing-bundle.js",
        "@npm//:node_modules/reflect-metadata/Reflect.js",
    ],
    browsers = [
        "@io_bazel_rules_webtesting//browsers:chromium-local",
        "@io_bazel_rules_webtesting//browsers:firefox-local",
    ],
    runtime_deps = [
        "//src:initialize_testbed",
    ],
    deps = [
        ":test_lib",
        "//src:rxjs_umd_modules",
    ],
)
        `);
}

    module.exports.writeFeatureModuleBuildFile = function writeFeatureModuleBuildFile(
        file, {name, featureModuleDeps}) {
  fs.writeFileSync(
      file,
      // Make Buildifier happy, don't format line below.
      `# Generated BUILD file, see /tools/generator
load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//:__subpackages__"])

# We don't import from these, but the generated ngfactory code will
NG_FACTORY_ADDED_IMPORTS = [
    "@npm//@angular/cdk",
    "@npm//@angular/material",
    "@npm//@angular/forms",
]

ng_module(
    name = "${name}",
    srcs = [
        "${name}.module.ts",
        "index/index.component.ts",
    ],
    assets = [
        "index/index.component.html",
    ],
    tsconfig = "//src:tsconfig.json",
    deps = NG_FACTORY_ADDED_IMPORTS + [
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/router",
        ${featureModuleDeps.map(s => `"${s}"`).join(',\n        ')},
    ],
)
    `);
}

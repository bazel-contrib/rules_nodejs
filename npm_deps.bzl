"""Define npm deps in yarn_install && npm_install repositories"""

load("//:index.bzl", _npm_install = "npm_install", _yarn_install = "yarn_install")

def npm_install(**kwargs):
    _npm_install(
        node_repository = "node16",
        **kwargs
    )

def yarn_install(**kwargs):
    _yarn_install(
        node_repository = "node16",
        **kwargs
    )

def npm_deps():
    """Organize all yarn_install and npm_install calls here to prevent WORKSPACE bloat"""

    yarn_install(
        name = "npm",
        data = [
            "//internal/npm_install/test:postinstall.js",
            "//tools/npm_packages/bazel_workspaces_consistent:BUILD.bazel",
            "//tools/npm_packages/bazel_workspaces_consistent:index.bzl",
            "//tools/npm_packages/bazel_workspaces_consistent:package.json",
            "//:tools/npm_packages/hello/package.json",
            "//:tools/npm_packages/hello/index.js",
            "//:tools/npm_packages/node_resolve_index/index.js",
            "//:tools/npm_packages/node_resolve_index_2/index.js",
            "//:tools/npm_packages/node_resolve_index_2/package.json",
            "//:tools/npm_packages/node_resolve_index_3/index.js",
            "//:tools/npm_packages/node_resolve_index_3/package.json",
            "//:tools/npm_packages/node_resolve_index_4/index.js",
            "//:tools/npm_packages/node_resolve_index_4/package.json",
            "//:tools/npm_packages/node_resolve_main/main.js",
            "//:tools/npm_packages/node_resolve_main/package.json",
            "//:tools/npm_packages/node_resolve_main_2/main.js",
            "//:tools/npm_packages/node_resolve_main_2/package.json",
            "//:tools/npm_packages/node_resolve_nested_main/package.json",
            "//:tools/npm_packages/node_resolve_nested_main/nested/main.js",
            "//:tools/npm_packages/node_resolve_nested_main/nested/package.json",
            "//:tools/npm_packages/testy/index.js",
            "//:tools/npm_packages/testy/package.json",
            "//:tools/npm_packages/pkg_with_bin/main.js",
            "//:tools/npm_packages/pkg_with_bin/package.json",
        ],
        environment = {
            "SOME_USER_ENV": "yarn is great!",
        },
        links = {
            "@test_multi_linker/lib-a": "//internal/linker/test/multi_linker/lib_a",
            "@test_multi_linker/lib-a2": "//internal/linker/test/multi_linker/lib_a",
            "@test_multi_linker/lib-b": "@//internal/linker/test/multi_linker/lib_b",
            "@test_multi_linker/lib-b2": "@//internal/linker/test/multi_linker/lib_b",
            "@test_multi_linker/lib-c": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_c",
            "@test_multi_linker/lib-c2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_c",
            "@test_multi_linker/lib-d": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_d",
            "@test_multi_linker/lib-d2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_d",
            "very_testy": "@npm//:testy_copy_js_library",
        },
        package_json = "//:package.json",
        yarn_lock = "//:yarn.lock",
        manual_build_file_contents = """
# re-link node_modules/testy as node_modules/very_testy
load("@build_bazel_rules_nodejs//:index.bzl", "js_library", "copy_to_bin")
copy_to_bin(
    name = "testy_copy",
    srcs = [
        "node_modules/testy/package.json",
        "node_modules/testy/index.js",
    ],
)
js_library(
    name = "testy_copy_js_library",
    srcs = [":testy_copy"],
    strip_prefix = "node_modules/testy",
    visibility = ["//very_testy:__pkg__"],
)
""",
        # symlink_node_modules needed for running e2e & example integration tests on Windows CI
        symlink_node_modules = True,
        # exports_directories_only needs to be disabled for @npm to support some legacy tests
        exports_directories_only = False,
    )

    yarn_install(
        name = "npm_directory_artifacts",
        data = [
            "//internal/npm_install/test:postinstall.js",
            "//tools/npm_packages/bazel_workspaces_consistent:BUILD.bazel",
            "//tools/npm_packages/bazel_workspaces_consistent:index.bzl",
            "//tools/npm_packages/bazel_workspaces_consistent:package.json",
            "//:tools/npm_packages/hello/package.json",
            "//:tools/npm_packages/hello/index.js",
            "//:tools/npm_packages/node_resolve_index/index.js",
            "//:tools/npm_packages/node_resolve_index_2/index.js",
            "//:tools/npm_packages/node_resolve_index_2/package.json",
            "//:tools/npm_packages/node_resolve_index_3/index.js",
            "//:tools/npm_packages/node_resolve_index_3/package.json",
            "//:tools/npm_packages/node_resolve_index_4/index.js",
            "//:tools/npm_packages/node_resolve_index_4/package.json",
            "//:tools/npm_packages/node_resolve_main/main.js",
            "//:tools/npm_packages/node_resolve_main/package.json",
            "//:tools/npm_packages/node_resolve_main_2/main.js",
            "//:tools/npm_packages/node_resolve_main_2/package.json",
            "//:tools/npm_packages/node_resolve_nested_main/package.json",
            "//:tools/npm_packages/node_resolve_nested_main/nested/main.js",
            "//:tools/npm_packages/node_resolve_nested_main/nested/package.json",
            "//:tools/npm_packages/testy/index.js",
            "//:tools/npm_packages/testy/package.json",
            "//:tools/npm_packages/pkg_with_bin/main.js",
            "//:tools/npm_packages/pkg_with_bin/package.json",
        ],
        environment = {
            "SOME_USER_ENV": "yarn is great!",
        },
        links = {
            "@test_multi_linker/lib-a": "//internal/linker/test/multi_linker/lib_a",
            "@test_multi_linker/lib-a2": "//internal/linker/test/multi_linker/lib_a",
            "@test_multi_linker/lib-b": "@//internal/linker/test/multi_linker/lib_b",
            "@test_multi_linker/lib-b2": "@//internal/linker/test/multi_linker/lib_b",
            "@test_multi_linker/lib-c": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_c",
            "@test_multi_linker/lib-c2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_c",
            "@test_multi_linker/lib-d": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_d",
            "@test_multi_linker/lib-d2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_d",
        },
        package_json = "//:package.json",
        yarn_lock = "//:yarn.lock",
    )

    yarn_install(
        name = "internal_test_multi_linker_deps",
        links = {
            "@test_multi_linker/lib-a": "@//internal/linker/test/multi_linker/lib_a",
            "@test_multi_linker/lib-a2": "@//internal/linker/test/multi_linker/lib_a",
            "@test_multi_linker/lib-b": "@//internal/linker/test/multi_linker/lib_b",
            "@test_multi_linker/lib-b2": "@//internal/linker/test/multi_linker/lib_b",
            "@test_multi_linker/lib-c": "@//internal/linker/test/multi_linker/lib_c",
            "@test_multi_linker/lib-c2": "@//internal/linker/test/multi_linker/lib_c",
            "@test_multi_linker/lib-d": "@//internal/linker/test/multi_linker/lib_d",
            "@test_multi_linker/lib-d2": "@//internal/linker/test/multi_linker/lib_d",
        },
        package_json = "//internal/linker/test/multi_linker:package.json",
        yarn_lock = "//internal/linker/test/multi_linker:yarn.lock",
    )

    yarn_install(
        name = "internal_test_multi_linker_test_a_deps",
        links = {
            "@test_multi_linker/lib-a": "@//internal/linker/test/multi_linker/lib_a",
            "@test_multi_linker/lib-a2": "@//internal/linker/test/multi_linker/lib_a",
            "@test_multi_linker/lib-b": "@//internal/linker/test/multi_linker/lib_b",
            "@test_multi_linker/lib-b2": "@//internal/linker/test/multi_linker/lib_b",
            "@test_multi_linker/lib-c": "@//internal/linker/test/multi_linker/lib_c",
            "@test_multi_linker/lib-c2": "@//internal/linker/test/multi_linker/lib_c",
            "@test_multi_linker/lib-d": "@//internal/linker/test/multi_linker/lib_d",
            "@test_multi_linker/lib-d2": "@//internal/linker/test/multi_linker/lib_d",
        },
        package_json = "//internal/linker/test/multi_linker/test_a:package.json",
        yarn_lock = "//internal/linker/test/multi_linker/test_a:yarn.lock",
    )

    yarn_install(
        name = "internal_test_multi_linker_test_b_deps",
        package_json = "//internal/linker/test/multi_linker/test_b:package.json",
        yarn_lock = "//internal/linker/test/multi_linker/test_b:yarn.lock",
    )

    yarn_install(
        name = "internal_test_multi_linker_test_c_deps",
        package_json = "//internal/linker/test/multi_linker/test_c:package.json",
        yarn_lock = "//internal/linker/test/multi_linker/test_c:yarn.lock",
    )

    yarn_install(
        name = "internal_test_multi_linker_test_d_deps",
        package_json = "//internal/linker/test/multi_linker/test_d:package.json",
        yarn_lock = "//internal/linker/test/multi_linker/test_d:yarn.lock",
    )

    yarn_install(
        name = "internal_test_multi_linker_lib_b_deps",
        # transitive deps for this first party lib should not include dev dependencies
        args = ["--production"],
        package_json = "//internal/linker/test/multi_linker/lib_b:package.json",
        yarn_lock = "//internal/linker/test/multi_linker/lib_b:yarn.lock",
    )

    yarn_install(
        name = "internal_test_multi_linker_lib_c_deps",
        # transitive deps for this first party lib should not include dev dependencies
        args = ["--production"],
        package_json = "//internal/linker/test/multi_linker/lib_c:lib/package.json",
        yarn_lock = "//internal/linker/test/multi_linker/lib_c:lib/yarn.lock",
    )

    yarn_install(
        name = "internal_test_multi_linker_sub_dev_deps",
        links = {
            "@test_multi_linker/lib-a": "//internal/linker/test/multi_linker/lib_a",
            "@test_multi_linker/lib-a2": "//internal/linker/test/multi_linker/lib_a",
            "@test_multi_linker/lib-b": "//internal/linker/test/multi_linker/lib_b",
            "@test_multi_linker/lib-b2": "//internal/linker/test/multi_linker/lib_b",
            "@test_multi_linker/lib-c": "//internal/linker/test/multi_linker/lib_c",
            "@test_multi_linker/lib-c2": "//internal/linker/test/multi_linker/lib_c",
            "@test_multi_linker/lib-d": "//internal/linker/test/multi_linker/lib_d",
            "@test_multi_linker/lib-d2": "//internal/linker/test/multi_linker/lib_d",
        },
        package_json = "//internal/linker/test/multi_linker/sub:package.json",
        package_path = "internal/linker/test/multi_linker/sub/dev",
        yarn_lock = "//internal/linker/test/multi_linker/sub:yarn.lock",
    )

    yarn_install(
        name = "internal_test_multi_linker_sub_deps",
        # transitive deps for this first party lib should not include dev dependencies
        args = ["--production"],
        links = {
            "@test_multi_linker/lib-a": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_a",
            "@test_multi_linker/lib-a2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_a",
            "@test_multi_linker/lib-b": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_b",
            "@test_multi_linker/lib-b2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_b",
            "@test_multi_linker/lib-c": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_c",
            "@test_multi_linker/lib-c2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_c",
            "@test_multi_linker/lib-d": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_d",
            "@test_multi_linker/lib-d2": "@build_bazel_rules_nodejs//internal/linker/test/multi_linker/lib_d",
        },
        package_json = "//internal/linker/test/multi_linker/sub:package.json",
        yarn_lock = "//internal/linker/test/multi_linker/sub:yarn.lock",
    )

    yarn_install(
        name = "internal_test_multi_linker_onep_a_deps",
        # transitive deps for this first party lib should not include dev dependencies
        args = ["--production"],
        package_json = "//internal/linker/test/multi_linker/onep_a:package.json",
        yarn_lock = "//internal/linker/test/multi_linker/onep_a:yarn.lock",
    )

    yarn_install(
        name = "fine_grained_deps_yarn",
        data = [
            "//:tools/npm_packages/local_module/yarn/BUILD.bazel",
            "//:tools/npm_packages/local_module/yarn/index.js",
            "//:tools/npm_packages/local_module/yarn/package.json",
            "//internal/npm_install/test:postinstall.js",
        ],
        environment = {
            "SOME_USER_ENV": "yarn is great!",
        },
        generate_local_modules_build_files = False,
        included_files = [
            "",
            ".js",
            ".d.ts",
            ".json",
            ".proto",
        ],
        package_json = "//:tools/fine_grained_deps_yarn/package.json",
        yarn_lock = "//:tools/fine_grained_deps_yarn/yarn.lock",
        package_path = "/",
        exports_directories_only = False,
    )

    npm_install(
        name = "fine_grained_deps_npm",
        data = [
            "//:tools/npm_packages/local_module/npm/BUILD.bazel",
            "//:tools/npm_packages/local_module/npm/index.js",
            "//:tools/npm_packages/local_module/npm/package.json",
            "//internal/npm_install/test:postinstall.js",
        ],
        environment = {
            "SOME_USER_ENV": "npm is cool!",
        },
        generate_local_modules_build_files = False,
        included_files = [
            "",
            ".js",
            ".d.ts",
            ".json",
            ".proto",
        ],
        npm_command = "install",
        package_json = "//:tools/fine_grained_deps_npm/package.json",
        package_lock_json = "//:tools/fine_grained_deps_npm/package-lock.json",
        package_path = "/",
        exports_directories_only = False,
    )

    yarn_install(
        name = "fine_grained_deps_yarn_directory_artifacts",
        data = [
            "//internal/npm_install/test:postinstall.js",
        ],
        environment = {
            "SOME_USER_ENV": "yarn is great!",
        },
        package_json = "//:tools/fine_grained_deps_yarn_directory_artifacts/package.json",
        package_path = "/",
        yarn_lock = "//:tools/fine_grained_deps_yarn_directory_artifacts/yarn.lock",
    )

    npm_install(
        name = "fine_grained_deps_npm_directory_artifacts",
        data = [
            "//internal/npm_install/test:postinstall.js",
        ],
        environment = {
            "SOME_USER_ENV": "npm is cool!",
        },
        npm_command = "install",
        package_json = "//:tools/fine_grained_deps_npm_directory_artifacts/package.json",
        package_path = "/",
        package_lock_json = "//:tools/fine_grained_deps_npm_directory_artifacts/package-lock.json",
    )

    yarn_install(
        name = "fine_grained_no_bin",
        package_json = "//:tools/fine_grained_no_bin/package.json",
        package_path = "/",
        yarn_lock = "//:tools/fine_grained_no_bin/yarn.lock",
    )

    yarn_install(
        name = "fine_grained_goldens",
        included_files = [
            "",
            ".js",
            ".jst",
            ".ts",
            ".map",
            ".d.ts",
            ".json",
            ".proto",
        ],
        links = {
            "@some-scope/some-target-b": "@//some/target/b",
            "@some-scope/some-target-b2": "@//some/target/b",
            "some-target-a": "//some/target/a",
            "some-target-a2": "//some/target/a",
        },
        manual_build_file_contents = """
filegroup(
  name = "golden_files",
  srcs = [
    "//:BUILD.bazel",
    "//:manual_build_file_contents",
    "//:WORKSPACE",
    "//@angular/core:BUILD.bazel",
    "//@gregmagolan:BUILD.bazel",
    "//@gregmagolan/test-a/bin:BUILD.bazel",
    "//@gregmagolan/test-a:BUILD.bazel",
    "//@gregmagolan/test-a:index.bzl",
    "//@gregmagolan/test-b:BUILD.bazel",
    "//ajv:BUILD.bazel",
    "//jasmine/bin:BUILD.bazel",
    "//jasmine:BUILD.bazel",
    "//jasmine:index.bzl",
    "//rxjs:BUILD.bazel",
    "//unidiff:BUILD.bazel",
    "//zone.js:BUILD.bazel",
    "//some-target-a:BUILD.bazel",
    "//some-target-a2:BUILD.bazel",
    "//@some-scope/some-target-b:BUILD.bazel",
    "//@some-scope/some-target-b2:BUILD.bazel",
  ],
)""",
        package_json = "//:tools/fine_grained_goldens/package.json",
        package_path = "/",
        yarn_lock = "//:tools/fine_grained_goldens/yarn.lock",
        exports_directories_only = False,
    )

    yarn_install(
        name = "fine_grained_directory_artifacts_goldens",
        links = {
            "@some-scope/some-target-b": "@//some/target/b",
            "@some-scope/some-target-b2": "@//some/target/b",
            "some-target-a": "//some/target/a",
            "some-target-a2": "//some/target/a",
        },
        manual_build_file_contents = """
filegroup(
  name = "golden_files",
  srcs = [
    "//:BUILD.bazel",
    "//:manual_build_file_contents",
    "//:WORKSPACE",
    "//@angular/core:BUILD.bazel",
    "//@gregmagolan:BUILD.bazel",
    "//@gregmagolan/test-a/bin:BUILD.bazel",
    "//@gregmagolan/test-a:BUILD.bazel",
    "//@gregmagolan/test-a:index.bzl",
    "//@gregmagolan/test-b:BUILD.bazel",
    "//ajv:BUILD.bazel",
    "//jasmine/bin:BUILD.bazel",
    "//jasmine:BUILD.bazel",
    "//jasmine:index.bzl",
    "//rxjs:BUILD.bazel",
    "//unidiff:BUILD.bazel",
    "//zone.js:BUILD.bazel",
    "//some-target-a:BUILD.bazel",
    "//some-target-a2:BUILD.bazel",
    "//@some-scope/some-target-b:BUILD.bazel",
    "//@some-scope/some-target-b2:BUILD.bazel",
  ],
)""",
        package_json = "//:tools/fine_grained_goldens/package.json",
        package_path = "/",
        yarn_lock = "//:tools/fine_grained_goldens/yarn.lock",
    )

    yarn_install(
        name = "internal_npm_install_test_patches_yarn",
        package_json = "//internal/npm_install/test/patches_yarn:package.json",
        patch_args = ["-p0"],
        patch_tool = "patch",
        post_install_patches = ["//internal/npm_install/test/patches_yarn:semver+1.0.0.patch"],
        pre_install_patches = ["//internal/npm_install/test/patches_yarn:package_json.patch"],
        package_json_remove = [
            "dependencies.__other_invalid_dependency__",
            "dependencies.ignored_doesnt_exist",
        ],
        package_json_replace = {
            # modify version
            "version": "1.0.0",
            # modify scripts.replace_me
            "scripts.replace_me": "replaced",
            # add scripts.new
            "scripts.new": "added",
        },
        yarn_lock = "//internal/npm_install/test/patches_yarn:yarn.lock",
        quiet = False,
        manual_build_file_contents = """exports_files(["_/internal/npm_install/test/patches_yarn/package.json"])""",
    )

    npm_install(
        name = "internal_npm_install_test_patches_npm",
        package_json = "//internal/npm_install/test/patches_npm:package.json",
        package_lock_json = "//internal/npm_install/test/patches_npm:package-lock.json",
        patch_args = ["-p0"],
        patch_tool = "patch",
        post_install_patches = ["//internal/npm_install/test/patches_npm:semver+1.0.0.patch"],
        pre_install_patches = ["//internal/npm_install/test/patches_npm:package_json.patch"],
        package_json_remove = [
            "dependencies.__other_invalid_dependency__",
            "dependencies.ignored_doesnt_exist",
        ],
        package_json_replace = {
            # modify version
            "version": "1.0.0",
            # modify scripts.replace_me
            "scripts.replace_me": "replaced",
            # add scripts.new
            "scripts.new": "added",
        },
        quiet = False,
        manual_build_file_contents = """exports_files(["_/internal/npm_install/test/patches_npm/package.json"])""",
    )

    yarn_install(
        name = "internal_npm_install_test_patches_yarn_symlinked",
        package_json = "//internal/npm_install/test/patches_yarn_symlinked:package.json",
        patch_args = ["-p0"],
        patch_tool = "patch",
        post_install_patches = ["//internal/npm_install/test/patches_yarn_symlinked:semver+1.0.0.patch"],
        symlink_node_modules = True,
        yarn_lock = "//internal/npm_install/test/patches_yarn_symlinked:yarn.lock",
        quiet = False,
    )

    npm_install(
        name = "internal_npm_install_test_patches_npm_symlinked",
        package_json = "//internal/npm_install/test/patches_npm_symlinked:package.json",
        package_lock_json = "//internal/npm_install/test/patches_npm_symlinked:package-lock.json",
        patch_args = ["-p0"],
        patch_tool = "patch",
        post_install_patches = ["//internal/npm_install/test/patches_npm_symlinked:semver+1.0.0.patch"],
        symlink_node_modules = True,
        quiet = False,
    )

    yarn_install(
        name = "fine_grained_goldens_multi_linked",
        included_files = [
            "",
            ".js",
            ".jst",
            ".ts",
            ".map",
            ".d.ts",
            ".json",
            ".proto",
        ],
        links = {
            "@some-scope/some-target-b": "@//some/target/b",
            "@some-scope/some-target-b2": "@//some/target/b",
            "some-target-a": "@build_bazel_rules_nodejs//some/target/a",
            "some-target-a2": "@build_bazel_rules_nodejs//some/target/a",
        },
        manual_build_file_contents = """
filegroup(
  name = "golden_files",
  srcs = [
    "//:BUILD.bazel",
    "//:manual_build_file_contents",
    "//:WORKSPACE",
    "//@angular/core:BUILD.bazel",
    "//@gregmagolan:BUILD.bazel",
    "//@gregmagolan/test-a/bin:BUILD.bazel",
    "//@gregmagolan/test-a:BUILD.bazel",
    "//@gregmagolan/test-a:index.bzl",
    "//@gregmagolan/test-b:BUILD.bazel",
    "//ajv:BUILD.bazel",
    "//jasmine/bin:BUILD.bazel",
    "//jasmine:BUILD.bazel",
    "//jasmine:index.bzl",
    "//rxjs:BUILD.bazel",
    "//unidiff:BUILD.bazel",
    "//zone.js:BUILD.bazel",
    "//some-target-a:BUILD.bazel",
    "//some-target-a2:BUILD.bazel",
    "//@some-scope/some-target-b:BUILD.bazel",
    "//@some-scope/some-target-b2:BUILD.bazel",
  ],
)""",
        package_json = "//:tools/fine_grained_goldens/package.json",
        yarn_lock = "//:tools/fine_grained_goldens/yarn.lock",
    )

    npm_install(
        name = "npm_node_patches",
        package_json = "//packages/node-patches:package.json",
        package_lock_json = "//packages/node-patches:package-lock.json",
        # TODO: fix tests when this flag is flipped
        exports_directories_only = False,
    )

    yarn_install(
        name = "cypress_deps",
        package_json = "//packages/cypress/test:package.json",
        yarn_lock = "//packages/cypress/test:yarn.lock",
        # TODO: get cypress rule working with symlink_node_modules = False
        symlink_node_modules = True,
        # TODO: get cypress rule working with exports_directories_only = True
        exports_directories_only = False,
    )

    yarn_install(
        name = "rollup_test_multi_linker_deps",
        package_json = "//packages/rollup/test/multi_linker:package.json",
        yarn_lock = "//packages/rollup/test/multi_linker:yarn.lock",
    )

    yarn_install(
        name = "ts_project_esm_support_deps",
        package_json = "//packages/typescript/test/ts_project/esm:package.json",
        yarn_lock = "//packages/typescript/test/ts_project/esm:yarn.lock",
    )

# Copyright 2017 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Install npm packages

Rules to install NodeJS dependencies during WORKSPACE evaluation.
This happens before the first build or test runs, allowing you to use Bazel
as the package manager.

See discussion in the README.
"""

load("//internal/common:os_name.bzl", "os_name")
load("//internal/node:node_labels.bzl", "get_node_label", "get_npm_label", "get_yarn_label")

COMMON_ATTRIBUTES = dict(dict(), **{
    "data": attr.label_list(),
    "exclude_packages": attr.string_list(
        doc = """List of packages to exclude from install.

        Use this when you want to install a package during manual yarn or npm
        install but not install it when Bazel manages dependencies.

        Note: this attribute may be removed in the future if bazel managed npm
        dependencies are changed to install to the workspace `node_modules` folder
        instead of `$(bazel info output_base)/external/wksp`.
        """,
        default = ["@bazel/bazel"],
    ),
    "included_files": attr.string_list(
        doc = """List of file extensions to be included in the npm package targets.

        For example, [".js", ".d.ts", ".proto", ".json", ""].

        This option is useful to limit the number of files that are inputs
        to actions that depend on npm package targets. See
        https://github.com/bazelbuild/bazel/issues/5153.

        If set to an empty list then all files are included in the package targets.
        If set to a list of extensions, only files with matching extensions are
        included in the package targets. An empty string in the list is a special
        string that denotes that files with no extensions such as `README` should
        be included in the package targets.

        This attribute applies to both the coarse `@wksp//:node_modules` target
        as well as the fine grained targets such as `@wksp//foo`.""",
        default = [],
    ),
    "manual_build_file_contents": attr.string(
        doc = """Experimental attribute that can be used to override
        the generated BUILD.bazel file and set its contents manually.
        Can be used to work-around a bazel performance issue if the
        default `@wksp//:node_modules` target has too many files in it.
        See https://github.com/bazelbuild/bazel/issues/5153. If
        you are running into performance issues due to a large
        node_modules target it is recommended to switch to using
        fine grained npm dependencies.""",
    ),
    "package_json": attr.label(
        mandatory = True,
        allow_single_file = True,
    ),
    "prod_only": attr.bool(
        default = False,
        doc = "Don't install devDependencies",
    ),
    "quiet": attr.bool(
        default = True,
        doc = "If stdout and stderr should be printed to the terminal.",
    ),
})

def _create_build_file(repository_ctx, node):
    repository_ctx.report_progress("Processing node_modules: installing Bazel packages and generating BUILD files")
    if repository_ctx.attr.manual_build_file_contents:
        repository_ctx.file("manual_build_file_contents", repository_ctx.attr.manual_build_file_contents)
    result = repository_ctx.execute([node, "generate_build_file.js", repository_ctx.attr.name, ",".join(repository_ctx.attr.included_files)])
    if result.return_code:
        fail("node failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

def _add_package_json(repository_ctx):
    repository_ctx.symlink(
        repository_ctx.attr.package_json,
        repository_ctx.path("_package.json"),
    )

def _add_scripts(repository_ctx):
    repository_ctx.template(
        "process_package_json.js",
        repository_ctx.path(Label("//internal/npm_install:process_package_json.js")),
        {},
    )
    repository_ctx.template(
        "generate_build_file.js",
        repository_ctx.path(Label("//internal/npm_install:generate_build_file.js")),
        {},
    )

def _add_data_dependencies(repository_ctx):
    """Add data dependencies to the repository."""
    for f in repository_ctx.attr.data:
        to = []
        if f.package:
            to += [f.package]
        to += [f.name]
        repository_ctx.symlink(f, repository_ctx.path("/".join(to)))

def _npm_install_impl(repository_ctx):
    """Core implementation of npm_install."""

    is_windows = os_name(repository_ctx).find("windows") != -1
    node = repository_ctx.path(get_node_label(repository_ctx))
    npm = get_npm_label(repository_ctx)
    npm_args = ["install"]

    if repository_ctx.attr.prod_only:
        npm_args.append("--production")

    # The entry points for npm install for osx/linux and windows
    if not is_windows:
        repository_ctx.file(
            "npm",
            content = """#!/usr/bin/env bash
# Immediately exit if any command fails.
set -e
(cd "{root}"; "{npm}" {npm_args})
""".format(
                root = repository_ctx.path(""),
                npm = repository_ctx.path(npm),
                npm_args = " ".join(npm_args),
            ),
            executable = True,
        )
    else:
        repository_ctx.file(
            "npm.cmd",
            content = """@echo off
cd "{root}" && "{npm}" {npm_args}
""".format(
                root = repository_ctx.path(""),
                npm = repository_ctx.path(npm),
                npm_args = " ".join(npm_args),
            ),
            executable = True,
        )

    if repository_ctx.attr.package_lock_json:
        if repository_ctx.attr.exclude_packages:
            # Copy the file over instead of using a symlink since the lock file
            # will be modified if there are excluded_packages
            repository_ctx.template(
                "package-lock.json",
                repository_ctx.path(repository_ctx.attr.package_lock_json),
                {},
            )
        else:
            repository_ctx.symlink(
                repository_ctx.attr.package_lock_json,
                repository_ctx.path("package-lock.json"),
            )

    _add_package_json(repository_ctx)
    _add_data_dependencies(repository_ctx)
    _add_scripts(repository_ctx)

    result = repository_ctx.execute([node, "process_package_json.js", ",".join(repository_ctx.attr.exclude_packages)])
    if result.return_code:
        fail("node failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

    repository_ctx.report_progress("Running npm install on %s" % repository_ctx.attr.package_json)
    result = repository_ctx.execute(
        [repository_ctx.path("npm.cmd" if is_windows else "npm")],
        timeout = repository_ctx.attr.timeout,
        quiet = repository_ctx.attr.quiet,
    )

    if not repository_ctx.attr.package_lock_json:
        print("\n***********WARNING***********\n%s: npm_install will require a package_lock_json attribute in future versions\n*****************************" % repository_ctx.name)

    if result.return_code:
        fail("npm_install failed: %s (%s)" % (result.stdout, result.stderr))

    remove_npm_absolute_paths = Label("@build_bazel_rules_nodejs_npm_install_deps//:node_modules/removeNPMAbsolutePaths/bin/removeNPMAbsolutePaths")

    # removeNPMAbsolutePaths is run on node_modules after npm install as the package.json files
    # generated by npm are non-deterministic. They contain absolute install paths and other private
    # information fields starting with "_". removeNPMAbsolutePaths removes all fields starting with "_".
    result = repository_ctx.execute(
        [node, repository_ctx.path(remove_npm_absolute_paths), repository_ctx.path("")],
    )

    if result.return_code:
        fail("remove_npm_absolute_paths failed: %s (%s)" % (result.stdout, result.stderr))

    _create_build_file(repository_ctx, node)

npm_install = repository_rule(
    attrs = dict(COMMON_ATTRIBUTES, **{
        "timeout": attr.int(
            default = 3600,
            doc = """Maximum duration of the command "npm install" in seconds
            (default is 3600 seconds).""",
        ),
        "package_lock_json": attr.label(
            allow_single_file = True,
        ),
    }),
    implementation = _npm_install_impl,
)
"""Runs npm install during workspace setup.
"""

def _yarn_install_impl(repository_ctx):
    """Core implementation of yarn_install."""

    node = repository_ctx.path(get_node_label(repository_ctx))
    yarn = get_yarn_label(repository_ctx)

    if repository_ctx.attr.yarn_lock:
        if repository_ctx.attr.exclude_packages:
            # Copy the file over instead of using a symlink since the lock file
            # will be modified if there are excluded_packages
            repository_ctx.template(
                "yarn.lock",
                repository_ctx.path(repository_ctx.attr.yarn_lock),
                {},
            )
        else:
            repository_ctx.symlink(
                repository_ctx.attr.yarn_lock,
                repository_ctx.path("yarn.lock"),
            )

    _add_package_json(repository_ctx)
    _add_data_dependencies(repository_ctx)
    _add_scripts(repository_ctx)

    result = repository_ctx.execute([node, "process_package_json.js", ",".join(repository_ctx.attr.exclude_packages)])
    if result.return_code:
        fail("node failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

    args = [
        repository_ctx.path(yarn),
        "--cwd",
        repository_ctx.path(""),
        "--network-timeout",
        str(repository_ctx.attr.network_timeout * 1000),  # in ms
    ]

    if repository_ctx.attr.prod_only:
        args.append("--prod")
    if not repository_ctx.attr.use_global_yarn_cache:
        args.extend(["--cache-folder", repository_ctx.path("_yarn_cache")])
    else:
        # Multiple yarn rules cannot run simultaneously using a shared cache.
        # See https://github.com/yarnpkg/yarn/issues/683
        # The --mutex option ensures only one yarn runs at a time, see
        # https://yarnpkg.com/en/docs/cli#toc-concurrency-and-mutex
        # The shared cache is not necessarily hermetic, but we need to cache downloaded
        # artifacts somewhere, so we rely on yarn to be correct.
        args.extend(["--mutex", "network"])

    repository_ctx.report_progress("Running yarn install on %s" % repository_ctx.attr.package_json)
    result = repository_ctx.execute(
        args,
        timeout = repository_ctx.attr.timeout,
        quiet = repository_ctx.attr.quiet,
    )

    if result.return_code:
        fail("yarn_install failed: %s (%s)" % (result.stdout, result.stderr))

    _create_build_file(repository_ctx, node)

yarn_install = repository_rule(
    attrs = dict(COMMON_ATTRIBUTES, **{
        "timeout": attr.int(
            default = 3600,
            doc = """Maximum duration of the command "yarn install" in seconds
            (default is 3600 seconds).""",
        ),
        "network_timeout": attr.int(
            default = 300,
            doc = """Maximum duration of a network request made by yarn in seconds
            (default is 300 seconds).""",
        ),
        "use_global_yarn_cache": attr.bool(
            default = True,
            doc = """Use the global yarn cache on the system.
            The cache lets you avoid downloading packages multiple times.
            However, it can introduce non-hermeticity, and the yarn cache can
            have bugs.
            Disabling this attribute causes every run of yarn to have a unique
            cache_directory.""",
        ),
        "yarn_lock": attr.label(
            mandatory = True,
            allow_single_file = True,
        ),
    }),
    implementation = _yarn_install_impl,
)
"""Runs yarn install during workspace setup.
"""

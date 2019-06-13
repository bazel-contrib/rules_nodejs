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

load("//internal/common:check_bazel_version.bzl", "check_bazel_version")
load("//internal/common:os_name.bzl", "os_name")
load("//internal/node:node_labels.bzl", "get_node_label", "get_npm_label", "get_yarn_label")

COMMON_ATTRIBUTES = dict(dict(), **{
    "always_hide_bazel_files": attr.bool(
        doc = """If True then Bazel build files such as `BUILD` and BUILD.bazel`
        will always be hidden by prefixing them with `_`.
        
        Defaults to False, in which case Bazel files are _not_ hidden when `symlink_node_modules`
        is True. In this case, the rule will report an error when there are Bazel files detected
        in npm packages.
        
        Reporting the error is desirable as relying on this repository rule to hide
        these files does not work in the case where a user deletes their node_modules folder
        and manually re-creates it with yarn or npm outside of Bazel which would restore them.
        On a subsequent Bazel build, this repository rule does not re-run and the presence
        of the Bazel files leads to a build failure that looks like the following:

        ```
        ERROR: /private/var/tmp/_bazel_greg/37b273501bbecefcf5ce4f3afcd7c47a/external/npm/BUILD.bazel:9:1:
        Label '@npm//:node_modules/rxjs/src/AsyncSubject.ts' crosses boundary of subpackage '@npm//node_modules/rxjs/src'
        (perhaps you meant to put the colon here: '@npm//node_modules/rxjs/src:AsyncSubject.ts'?)
        ```

        See https://github.com/bazelbuild/rules_nodejs/issues/802 for more details.
        
        The recommended solution is to use the @bazel/hide-bazel-files utility to hide these files.
        See https://github.com/bazelbuild/rules_nodejs/blob/master/packages/hide-bazel-files/README.md
        for installation instructions.

        The alternate solution is to set `always_hide_bazel_files` to True which tell
        this rule to hide Bazel files even when `symlink_node_modules` is True. This means
        you won't need to use `@bazel/hide-bazel-files` utility but if you manually recreate
        your `node_modules` folder via yarn or npm outside of Bazel you may run into the above
        error.""",
        default = False,
    ),
    "data": attr.label_list(
        doc = """Data files required by this rule.

        If symlink_node_modules is True, this attribute is ignored since
        the dependency manager will run in the package.json location.""",
    ),
    "exclude_packages": attr.string_list(
        doc = """DEPRECATED. This attribute is no longer used.""",
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
    "symlink_node_modules": attr.bool(
        doc = """Turn symlinking of node_modules on
        
        This requires the use of Bazel 0.26.0 and the experimental
        managed_directories feature.
        
        When true, the package manager will run in the package.json folder
        and the resulting node_modules folder will be symlinked into the
        external repository create by this rule.
        
        When false, the package manager will run in the external repository
        created by this rule and any files other than the package.json file and
        the lock file that are required for it to run should be listed in the
        data attribute.""",
        default = True,
    ),
})

def _create_build_files(repository_ctx, rule_type, node, lock_file):
    error_on_build_files = repository_ctx.attr.symlink_node_modules and not repository_ctx.attr.always_hide_bazel_files

    repository_ctx.report_progress("Processing node_modules: installing Bazel packages and generating BUILD files")
    if repository_ctx.attr.manual_build_file_contents:
        repository_ctx.file("manual_build_file_contents", repository_ctx.attr.manual_build_file_contents)
    result = repository_ctx.execute([
        node,
        "generate_build_file.js",
        repository_ctx.attr.name,
        rule_type,
        "1" if error_on_build_files else "0",
        str(lock_file),
        ",".join(repository_ctx.attr.included_files),
    ], quiet = False)
    if result.return_code:
        fail("generate_build_file.js failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

def _add_scripts(repository_ctx):
    repository_ctx.template(
        "pre_process_package_json.js",
        repository_ctx.path(Label("//internal/npm_install:pre_process_package_json.js")),
        {},
    )

    repository_ctx.template(
        "generate_build_file.js",
        repository_ctx.path(Label("//internal/npm_install:generate_build_file.js")),
        {},
    )

def _add_package_json(repository_ctx):
    repository_ctx.symlink(
        repository_ctx.attr.package_json,
        repository_ctx.path("package.json"),
    )

def _add_data_dependencies(repository_ctx):
    """Add data dependencies to the repository."""
    for f in repository_ctx.attr.data:
        to = []
        if f.package:
            to += [f.package]
        to += [f.name]

        # Make copies of the data files instead of symlinking
        # as yarn under linux will have trouble using symlinked
        # files as npm file:// packages
        repository_ctx.template("/".join(to), f, {})

def _symlink_node_modules(repository_ctx):
    package_json_dir = repository_ctx.path(repository_ctx.attr.package_json).dirname
    repository_ctx.symlink(repository_ctx.path(str(package_json_dir) + "/node_modules"), repository_ctx.path("node_modules"))

def _check_min_bazel_version(rule, repository_ctx):
    if repository_ctx.attr.symlink_node_modules:
        # When using symlink_node_modules enforce the minimum Bazel version required
        check_bazel_version(
            message = """
        A minimum Bazel version of 0.26.0 is required for the %s @%s repository rule.

        By default, yarn_install and npm_install in build_bazel_rules_nodejs >= 0.30.0
        depends on the managed directory feature added in Bazel 0.26.0. See
        https://github.com/bazelbuild/rules_nodejs/wiki#migrating-to-rules_nodejs-030.

        You can opt out of this feature by setting `symlink_node_modules = False`
        on all of your yarn_install & npm_install rules.
        """ % (rule, repository_ctx.attr.name),
            minimum_bazel_version = "0.26.0",
        )

def _npm_install_impl(repository_ctx):
    """Core implementation of npm_install."""

    _check_min_bazel_version("npm_install", repository_ctx)

    os = os_name(repository_ctx)
    is_windows = os.find("windows") != -1
    node = repository_ctx.path(get_node_label(os))
    npm = get_npm_label(os)
    npm_args = ["install"]

    if repository_ctx.attr.prod_only:
        npm_args.append("--production")

    # If symlink_node_modules is true then run the package manager
    # in the package.json folder; otherwise, run it in the root of
    # the external repository
    if repository_ctx.attr.symlink_node_modules:
        root = repository_ctx.path(repository_ctx.attr.package_json).dirname
    else:
        root = repository_ctx.path("")

    # The entry points for npm install for osx/linux and windows
    if not is_windows:
        repository_ctx.file(
            "npm",
            content = """#!/usr/bin/env bash
# Immediately exit if any command fails.
set -e
(cd "{root}"; "{npm}" {npm_args})
""".format(
                root = root,
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
                root = root,
                npm = repository_ctx.path(npm),
                npm_args = " ".join(npm_args),
            ),
            executable = True,
        )

    if not repository_ctx.attr.symlink_node_modules:
        repository_ctx.symlink(
            repository_ctx.attr.package_lock_json,
            repository_ctx.path("package-lock.json"),
        )
        _add_package_json(repository_ctx)
        _add_data_dependencies(repository_ctx)

    _add_scripts(repository_ctx)

    result = repository_ctx.execute(
        [node, "pre_process_package_json.js", repository_ctx.path(repository_ctx.attr.package_json), "npm"],
        quiet = repository_ctx.attr.quiet,
    )
    if result.return_code:
        fail("pre_process_package_json.js failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

    repository_ctx.report_progress("Running npm install on %s" % repository_ctx.attr.package_json)
    result = repository_ctx.execute(
        [repository_ctx.path("npm.cmd" if is_windows else "npm")],
        timeout = repository_ctx.attr.timeout,
        quiet = repository_ctx.attr.quiet,
    )

    if result.return_code:
        fail("npm_install failed: %s (%s)" % (result.stdout, result.stderr))

    remove_npm_absolute_paths = Label("//third_party/github.com/juanjoDiaz/removeNPMAbsolutePaths:bin/removeNPMAbsolutePaths")

    # removeNPMAbsolutePaths is run on node_modules after npm install as the package.json files
    # generated by npm are non-deterministic. They contain absolute install paths and other private
    # information fields starting with "_". removeNPMAbsolutePaths removes all fields starting with "_".
    result = repository_ctx.execute(
        [node, repository_ctx.path(remove_npm_absolute_paths), "/".join([str(root), "node_modules"])],
    )

    if result.return_code:
        fail("remove_npm_absolute_paths failed: %s (%s)" % (result.stdout, result.stderr))

    if repository_ctx.attr.symlink_node_modules:
        _symlink_node_modules(repository_ctx)

    _create_build_files(repository_ctx, "npm_install", node, repository_ctx.attr.package_lock_json)

npm_install = repository_rule(
    attrs = dict(COMMON_ATTRIBUTES, **{
        "timeout": attr.int(
            default = 3600,
            doc = """Maximum duration of the command "npm install" in seconds
            (default is 3600 seconds).""",
        ),
        "package_lock_json": attr.label(
            mandatory = True,
            allow_single_file = True,
        ),
    }),
    implementation = _npm_install_impl,
)
"""Runs npm install during workspace setup."""
# Adding the above docstring as `doc` attribute causes a build
# error since `doc` is not a valid attribute of repository_rule.
# See https://github.com/bazelbuild/buildtools/issues/471#issuecomment-485278689.

def _yarn_install_impl(repository_ctx):
    """Core implementation of yarn_install."""

    _check_min_bazel_version("yarn_install", repository_ctx)

    os = os_name(repository_ctx)
    node = repository_ctx.path(get_node_label(os))
    yarn = get_yarn_label(os)

    # If symlink_node_modules is true then run the package manager
    # in the package.json folder; otherwise, run it in the root of
    # the external repository
    if repository_ctx.attr.symlink_node_modules:
        root = repository_ctx.path(repository_ctx.attr.package_json).dirname
    else:
        root = repository_ctx.path("")

    if not repository_ctx.attr.symlink_node_modules:
        repository_ctx.symlink(
            repository_ctx.attr.yarn_lock,
            repository_ctx.path("yarn.lock"),
        )
        _add_package_json(repository_ctx)
        _add_data_dependencies(repository_ctx)

    _add_scripts(repository_ctx)

    result = repository_ctx.execute(
        [node, "pre_process_package_json.js", repository_ctx.path(repository_ctx.attr.package_json), "yarn"],
        quiet = repository_ctx.attr.quiet,
    )
    if result.return_code:
        fail("pre_process_package_json.js failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

    args = [
        repository_ctx.path(yarn),
        "--cwd",
        root,
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

    if repository_ctx.attr.symlink_node_modules:
        _symlink_node_modules(repository_ctx)

    _create_build_files(repository_ctx, "yarn_install", node, repository_ctx.attr.yarn_lock)

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
"""Runs yarn install during workspace setup."""
# Adding the above docstring as `doc` attribute causes a build
# error since `doc` is not a valid attribute of repository_rule.
# See https://github.com/bazelbuild/buildtools/issues/471#issuecomment-485278689.

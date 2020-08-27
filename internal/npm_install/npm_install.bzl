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

load("//:version.bzl", "VERSION")
load("//internal/common:check_bazel_version.bzl", "check_bazel_version")
load("//internal/common:os_name.bzl", "is_windows_os", "os_name")
load("//internal/node:node_labels.bzl", "get_node_label", "get_npm_label", "get_yarn_label")

COMMON_ATTRIBUTES = dict(dict(), **{
    "data": attr.label_list(
        doc = """Data files required by this rule.

If symlink_node_modules is True, this attribute is optional since the package manager
will run in your workspace folder. It is recommended, however, that all files that the
package manager depends on, such as `.rc` files or files used in `postinstall`, are added
symlink_node_modules is True so that the repository rule is rerun when any of these files
change.

If symlink_node_modules is False, the package manager is run in the bazel external
repository so all files that the package manager depends on must be listed.
""",
    ),
    "environment": attr.string_dict(
        doc = """Environment variables to set before calling the package manager.""",
        default = {},
    ),
    "node_repository": attr.string(
        doc = """If a custom name was provided to node_repositories, specify it here.""",
        default = """nodejs""",
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
as well as the fine grained targets such as `@wksp//foo`.
""",
        default = [],
    ),
    "manual_build_file_contents": attr.string(
        doc = """Experimental attribute that can be used to override the generated BUILD.bazel file and set its contents manually.

Can be used to work-around a bazel performance issue if the
default `@wksp//:node_modules` target has too many files in it.
See https://github.com/bazelbuild/bazel/issues/5153. If
you are running into performance issues due to a large
node_modules target it is recommended to switch to using
fine grained npm dependencies.
""",
    ),
    "package_json": attr.label(
        mandatory = True,
        allow_single_file = True,
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
data attribute.
""",
        default = True,
    ),
    "timeout": attr.int(
        default = 3600,
        doc = """Maximum duration of the package manager execution in seconds.""",
    ),
})

def _create_build_files(repository_ctx, rule_type, node, lock_file):
    repository_ctx.report_progress("Processing node_modules: installing Bazel packages and generating BUILD files")
    if repository_ctx.attr.manual_build_file_contents:
        repository_ctx.file("manual_build_file_contents", repository_ctx.attr.manual_build_file_contents)
    result = repository_ctx.execute([
        node,
        "index.js",
        repository_ctx.attr.name,
        rule_type,
        repository_ctx.path(lock_file),
        ",".join(repository_ctx.attr.included_files),
        native.bazel_version,
    ])
    if result.return_code:
        fail("generate_build_file.ts failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

def _add_scripts(repository_ctx):
    repository_ctx.template(
        "pre_process_package_json.js",
        repository_ctx.path(Label("//internal/npm_install:pre_process_package_json.js")),
        {},
    )

    repository_ctx.template(
        "index.js",
        repository_ctx.path(Label("//internal/npm_install:index.js")),
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

def _add_node_repositories_info_deps(repository_ctx):
    # Add a dep to the node_info & yarn_info files from node_repositories
    # so that if the node or yarn versions change we re-run the repository rule
    repository_ctx.symlink(
        Label("@%s_%s//:node_info" % (repository_ctx.name, os_name(repository_ctx))),
        repository_ctx.path("_node_info"),
    )
    repository_ctx.symlink(
        Label("@%s_%s//:yarn_info" % (repository_ctx.name, os_name(repository_ctx))),
        repository_ctx.path("_yarn_info"),
    )

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

    is_windows_host = is_windows_os(repository_ctx)
    node = repository_ctx.path(get_node_label(repository_ctx))
    npm = get_npm_label(repository_ctx)
    npm_args = ["install"] + repository_ctx.attr.args

    # If symlink_node_modules is true then run the package manager
    # in the package.json folder; otherwise, run it in the root of
    # the external repository
    if repository_ctx.attr.symlink_node_modules:
        root = repository_ctx.path(repository_ctx.attr.package_json).dirname
    else:
        root = repository_ctx.path("")

    # The entry points for npm install for osx/linux and windows
    if not is_windows_host:
        # Prefix filenames with _ so they don't conflict with the npm package `npm`
        repository_ctx.file(
            "_npm.sh",
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
            "_npm.cmd",
            content = """@echo off
cd /D "{root}" && "{npm}" {npm_args}
""".format(
                root = root,
                npm = repository_ctx.path(npm),
                npm_args = " ".join(npm_args),
            ),
            executable = True,
        )

    repository_ctx.symlink(
        repository_ctx.attr.package_lock_json,
        repository_ctx.path("package-lock.json"),
    )
    _add_package_json(repository_ctx)
    _add_data_dependencies(repository_ctx)
    _add_scripts(repository_ctx)
    _add_node_repositories_info_deps(repository_ctx)

    result = repository_ctx.execute(
        [node, "pre_process_package_json.js", repository_ctx.path(repository_ctx.attr.package_json), "npm"],
        quiet = repository_ctx.attr.quiet,
    )
    if result.return_code:
        fail("pre_process_package_json.js failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

    env = dict(repository_ctx.attr.environment)
    env_key = "BAZEL_NPM_INSTALL"
    if env_key not in env.keys():
        env[env_key] = "1"
    env["BUILD_BAZEL_RULES_NODEJS_VERSION"] = VERSION

    repository_ctx.report_progress("Running npm install on %s" % repository_ctx.attr.package_json)
    result = repository_ctx.execute(
        [repository_ctx.path("_npm.cmd" if is_windows_host else "_npm.sh")],
        timeout = repository_ctx.attr.timeout,
        quiet = repository_ctx.attr.quiet,
        environment = env,
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
        "args": attr.string_list(
            doc = """Arguments passed to npm install.

See npm CLI docs https://docs.npmjs.com/cli/install.html for complete list of supported arguments.""",
            default = [],
        ),
        "package_lock_json": attr.label(
            mandatory = True,
            allow_single_file = True,
        ),
    }),
    doc = """Runs npm install during workspace setup.

This rule will set the environment variable `BAZEL_NPM_INSTALL` to '1' (unless it
set to another value in the environment attribute). Scripts may use to this to 
check if yarn is being run by the `npm_install` repository rule.""",
    implementation = _npm_install_impl,
)

def _yarn_install_impl(repository_ctx):
    """Core implementation of yarn_install."""

    _check_min_bazel_version("yarn_install", repository_ctx)

    is_windows_host = is_windows_os(repository_ctx)
    node = repository_ctx.path(get_node_label(repository_ctx))
    yarn = get_yarn_label(repository_ctx)

    yarn_args = []
    if not repository_ctx.attr.use_global_yarn_cache:
        yarn_args.extend(["--cache-folder", str(repository_ctx.path("_yarn_cache"))])
    else:
        # Multiple yarn rules cannot run simultaneously using a shared cache.
        # See https://github.com/yarnpkg/yarn/issues/683
        # The --mutex option ensures only one yarn runs at a time, see
        # https://yarnpkg.com/en/docs/cli#toc-concurrency-and-mutex
        # The shared cache is not necessarily hermetic, but we need to cache downloaded
        # artifacts somewhere, so we rely on yarn to be correct.
        yarn_args.extend(["--mutex", "network"])
    yarn_args.extend(repository_ctx.attr.args)

    # If symlink_node_modules is true then run the package manager
    # in the package.json folder; otherwise, run it in the root of
    # the external repository
    if repository_ctx.attr.symlink_node_modules:
        root = repository_ctx.path(repository_ctx.attr.package_json).dirname
    else:
        root = repository_ctx.path("")

    # The entry points for npm install for osx/linux and windows
    if not is_windows_host:
        # Prefix filenames with _ so they don't conflict with the npm packages.
        # Unset YARN_IGNORE_PATH before calling yarn incase it is set so that
        # .yarnrc yarn-path is followed if set. This is for the case when calling
        # bazel from yarn with `yarn bazel ...` and yarn follows yarn-path in
        # .yarnrc it will set YARN_IGNORE_PATH=1 which will prevent the bazel
        # call into yarn from also following the yarn-path as desired.
        repository_ctx.file(
            "_yarn.sh",
            content = """#!/usr/bin/env bash
# Immediately exit if any command fails.
set -e
unset YARN_IGNORE_PATH
(cd "{root}"; "{yarn}" {yarn_args})
""".format(
                root = root,
                yarn = repository_ctx.path(yarn),
                yarn_args = " ".join(yarn_args),
            ),
            executable = True,
        )
    else:
        repository_ctx.file(
            "_yarn.cmd",
            content = """@echo off
set "YARN_IGNORE_PATH="
cd /D "{root}" && "{yarn}" {yarn_args}
""".format(
                root = root,
                yarn = repository_ctx.path(yarn),
                yarn_args = " ".join(yarn_args),
            ),
            executable = True,
        )

    repository_ctx.symlink(
        repository_ctx.attr.yarn_lock,
        repository_ctx.path("yarn.lock"),
    )
    _add_package_json(repository_ctx)
    _add_data_dependencies(repository_ctx)
    _add_scripts(repository_ctx)
    _add_node_repositories_info_deps(repository_ctx)

    result = repository_ctx.execute(
        [node, "pre_process_package_json.js", repository_ctx.path(repository_ctx.attr.package_json), "yarn"],
        quiet = repository_ctx.attr.quiet,
    )
    if result.return_code:
        fail("pre_process_package_json.js failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

    env = dict(repository_ctx.attr.environment)
    env_key = "BAZEL_YARN_INSTALL"
    if env_key not in env.keys():
        env[env_key] = "1"
    env["BUILD_BAZEL_RULES_NODEJS_VERSION"] = VERSION

    repository_ctx.report_progress("Running yarn install on %s" % repository_ctx.attr.package_json)
    result = repository_ctx.execute(
        [repository_ctx.path("_yarn.cmd" if is_windows_host else "_yarn.sh")],
        timeout = repository_ctx.attr.timeout,
        quiet = repository_ctx.attr.quiet,
        environment = env,
    )
    if result.return_code:
        fail("yarn_install failed: %s (%s)" % (result.stdout, result.stderr))

    if repository_ctx.attr.symlink_node_modules:
        _symlink_node_modules(repository_ctx)

    _create_build_files(repository_ctx, "yarn_install", node, repository_ctx.attr.yarn_lock)

yarn_install = repository_rule(
    attrs = dict(COMMON_ATTRIBUTES, **{
        "args": attr.string_list(
            doc = """Arguments passed to yarn install.

See yarn CLI docs https://yarnpkg.com/en/docs/cli/install for complete list of supported arguments.""",
            default = [],
        ),
        "use_global_yarn_cache": attr.bool(
            default = True,
            doc = """Use the global yarn cache on the system.

The cache lets you avoid downloading packages multiple times.
However, it can introduce non-hermeticity, and the yarn cache can
have bugs.

Disabling this attribute causes every run of yarn to have a unique
cache_directory.

If True, this rule will pass `--mutex network` to yarn to ensure that
the global cache can be shared by parallelized yarn_install rules.

If False, this rule will pass `--cache-folder /path/to/external/repository/__yarn_cache`
to yarn so that the local cache is contained within the external repository.
""",
        ),
        "yarn_lock": attr.label(
            mandatory = True,
            allow_single_file = True,
        ),
    }),
    doc = """Runs yarn install during workspace setup.

This rule will set the environment variable `BAZEL_YARN_INSTALL` to '1' (unless it
set to another value in the environment attribute). Scripts may use to this to 
check if yarn is being run by the `yarn_install` repository rule.""",
    implementation = _yarn_install_impl,
)

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
    "generate_local_modules_build_files": attr.bool(
        default = True,
        doc = """Enables the BUILD files auto generation for local modules installed with `file:` (npm) or `link:` (yarn)

When using a monorepo it's common to have modules that we want to use locally and
publish to an external package repository. This can be achieved using a `js_library` rule
with a `package_name` attribute defined inside the local package `BUILD` file. However,
if the project relies on the local package dependency with `file:` (npm) or `link:` (yarn) to be used outside Bazel, this
could introduce a race condition with both `npm_install` or `yarn_install` rules.

In order to overcome it, a link could be created to the package `BUILD` file from the
npm external Bazel repository (so we can use a local BUILD file instead of an auto generated one),
which require us to set `generate_local_modules_build_files = False` and complete a last step which is writing the
expected targets on that same `BUILD` file to be later used both by `npm_install` or `yarn_install`
rules, which are: `<package_name__files>`, `<package_name__nested_node_modules>`,
`<package_name__contents>`, `<package_name__typings>` and the last one just `<package_name>`. If you doubt what those targets
should look like, check the generated `BUILD` file for a given node module.

When true, the rule will follow the default behaviour of auto generating BUILD files for each `node_module` at install time.

When False, the rule will not auto generate BUILD files for `node_modules` that are installed as symlinks for local modules.
""",
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
    "links": attr.string_dict(
        doc = """Targets to link as npm packages.

A mapping of npm package names to bazel targets to linked into node_modules.

If `package_path` is also set, the bazel target will be linked to the node_modules at `package_path`
along with other 3rd party npm packages from this rule.

For example,

```
yarn_install(
    name = "npm",
    package_json = "//web:package.json",
    yarn_lock = "//web:yarn.lock",
    package_path = "web",
    links = {
        "@scope/target": "//some/scoped/target",
        "target": "//some/target",
    },
)
```

creates targets in the @npm external workspace that can be used by other rules which
are linked into `web/node_modules` along side the 3rd party deps since the `project_path` is `web`.

The above links will create the targets,

```
@npm//@scope/target
@npm//target
```

that can be referenced as `data` or `deps` by other rules such as `nodejs_binary` and `ts_project`
and can be required as `@scope/target` and `target` with standard node_modules resolution at runtime,

```
nodejs_binary(
    name = "bin",
    entry_point = "bin.js",
    deps = [
        "@npm//@scope/target",
        "@npm//target"
        "@npm//other/dep"
    ],
)

ts_project(
    name = "test",
    srcs = [...],
    deps = [
        "@npm//@scope/target",
        "@npm//target"
        "@npm//other/dep"
    ],
)
```
""",
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
    "package_path": attr.string(
        default = "",
        doc = """If set, link the 3rd party node_modules dependencies under the package path specified.

In most cases, this should be the directory of the package.json file so that the linker links the node_modules
in the same location they are found in the source tree. In a future release, this will default to the package.json
directory. This is planned for 4.0: https://github.com/bazelbuild/rules_nodejs/issues/2451""",
    ),
    "quiet": attr.bool(
        default = True,
        doc = "If stdout and stderr should be printed to the terminal.",
    ),
    "strict_visibility": attr.bool(
        default = True,
        doc = """Turn on stricter visibility for generated BUILD.bazel files

When enabled, only dependencies within the given `package.json` file are given public visibility.
All transitive dependencies are given limited visibility, enforcing that all direct dependencies are
listed in the `package.json` file.
""",
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

def _create_build_files(repository_ctx, rule_type, node, lock_file, generate_local_modules_build_files):
    repository_ctx.report_progress("Processing node_modules: installing Bazel packages and generating BUILD files")
    if repository_ctx.attr.manual_build_file_contents:
        repository_ctx.file("manual_build_file_contents", repository_ctx.attr.manual_build_file_contents)

    # validate links
    validated_links = {}
    for k, v in repository_ctx.attr.links.items():
        if v.startswith("//"):
            v = "@%s" % v
        if not v.startswith("@"):
            fail("link target must be label of form '@wksp//path/to:target', '@//path/to:target' or '//path/to:target'")
        validated_links[k] = v
    generate_config_json = struct(
        generate_local_modules_build_files = generate_local_modules_build_files,
        included_files = repository_ctx.attr.included_files,
        links = validated_links,
        package_json = str(repository_ctx.path(repository_ctx.attr.package_json)),
        package_lock = str(repository_ctx.path(lock_file)),
        package_path = repository_ctx.attr.package_path,
        rule_type = rule_type,
        strict_visibility = repository_ctx.attr.strict_visibility,
        workspace = repository_ctx.attr.name,
        workspace_root_prefix = _workspace_root_prefix(repository_ctx),
    ).to_json()
    repository_ctx.file("generate_config.json", generate_config_json)
    result = repository_ctx.execute(
        [node, "index.js"],
        # double the default timeout in case of many packages, see #2231
        timeout = 1200,
        quiet = repository_ctx.attr.quiet,
    )
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

def _workspace_root_path(repository_ctx, f):
    segments = ["_"]
    if f.package:
        segments.append(f.package)
    segments.append(f.name)
    return "/".join(segments)

def _workspace_root_prefix(repository_ctx):
    package_json = repository_ctx.attr.package_json
    segments = ["_"]
    if package_json.package:
        segments.append(package_json.package)
    segments.extend(package_json.name.split("/"))
    segments.pop()
    return "/".join(segments) + "/"

def _copy_file(repository_ctx, f):
    to = _workspace_root_path(repository_ctx, f)

    # ensure the destination directory exists
    to_segments = to.split("/")
    if len(to_segments) > 1:
        dirname = "/".join(to_segments[:-1])
        result = repository_ctx.execute(
            ["mkdir", "-p", dirname],
            quiet = repository_ctx.attr.quiet,
        )
        if result.return_code:
            fail("mkdir -p %s failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (dirname, result.stdout, result.stderr))

    # copy the file; don't use the repository_ctx.template trick with empty substitution as this
    # does not copy over binary files properly
    result = repository_ctx.execute(
        ["cp", "-f", repository_ctx.path(f), to],
        quiet = repository_ctx.attr.quiet,
    )
    if result.return_code:
        fail("cp -f %s %s failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (repository_ctx.path(f), to, result.stdout, result.stderr))

def _symlink_file(repository_ctx, f):
    repository_ctx.symlink(f, _workspace_root_path(repository_ctx, f))

def _copy_data_dependencies(repository_ctx):
    """Add data dependencies to the repository."""
    for f in repository_ctx.attr.data:
        # Make copies of the data files instead of symlinking
        # as yarn under linux will have trouble using symlinked
        # files as npm file:// packages
        _copy_file(repository_ctx, f)

def _add_node_repositories_info_deps(repository_ctx):
    # Add a dep to the node_info & yarn_info files from node_repositories
    # so that if the node or yarn versions change we re-run the repository rule
    repository_ctx.symlink(
        Label("@nodejs_%s//:node_info" % os_name(repository_ctx)),
        repository_ctx.path("_node_info"),
    )
    repository_ctx.symlink(
        Label("@nodejs_%s//:yarn_info" % os_name(repository_ctx)),
        repository_ctx.path("_yarn_info"),
    )

def _symlink_node_modules(repository_ctx):
    package_json_dir = repository_ctx.path(repository_ctx.attr.package_json).dirname
    if repository_ctx.attr.symlink_node_modules:
        repository_ctx.symlink(
            repository_ctx.path(str(package_json_dir) + "/node_modules"),
            repository_ctx.path("node_modules"),
        )
    else:
        repository_ctx.symlink(
            repository_ctx.path(_workspace_root_prefix(repository_ctx) + "node_modules"),
            repository_ctx.path("node_modules"),
        )

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

    # Set the base command (install or ci)
    npm_args = [repository_ctx.attr.npm_command]

    npm_args.extend(repository_ctx.attr.args)

    # Run the package manager in the package.json folder
    if repository_ctx.attr.symlink_node_modules:
        root = str(repository_ctx.path(repository_ctx.attr.package_json).dirname)
    else:
        root = str(repository_ctx.path(_workspace_root_prefix(repository_ctx)))

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

    _symlink_file(repository_ctx, repository_ctx.attr.package_lock_json)
    _copy_file(repository_ctx, repository_ctx.attr.package_json)
    _copy_data_dependencies(repository_ctx)
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
    if not repository_ctx.attr.quiet:
        print([node, repository_ctx.path(remove_npm_absolute_paths), root + "/node_modules"])
    result = repository_ctx.execute(
        [node, repository_ctx.path(remove_npm_absolute_paths), root + "/node_modules"],
    )

    if result.return_code:
        fail("remove_npm_absolute_paths failed: %s (%s)" % (result.stdout, result.stderr))

    _symlink_node_modules(repository_ctx)

    _create_build_files(repository_ctx, "npm_install", node, repository_ctx.attr.package_lock_json, repository_ctx.attr.generate_local_modules_build_files)

npm_install = repository_rule(
    attrs = dict(COMMON_ATTRIBUTES, **{
        "args": attr.string_list(
            doc = """Arguments passed to npm install.

See npm CLI docs https://docs.npmjs.com/cli/install.html for complete list of supported arguments.""",
            default = [],
        ),
        "npm_command": attr.string(
            default = "ci",
            doc = """The npm command to run, to install dependencies.

            See npm docs <https://docs.npmjs.com/cli/v6/commands>

            In particular, for "ci" it says:
            > If dependencies in the package lock do not match those in package.json, npm ci will exit with an error, instead of updating the package lock.
            """,
            values = ["ci", "install"],
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

    # Set frozen lockfile as default install to install the exact version from the yarn.lock
    # file. To perform an yarn install use the vendord yarn binary with:
    # `bazel run @nodejs//:yarn install` or `bazel run @nodejs//:yarn install -- -D <dep-name>`
    if repository_ctx.attr.frozen_lockfile:
        yarn_args.append("--frozen-lockfile")

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

    # Run the package manager in the package.json folder
    if repository_ctx.attr.symlink_node_modules:
        root = str(repository_ctx.path(repository_ctx.attr.package_json).dirname)
    else:
        root = str(repository_ctx.path(_workspace_root_prefix(repository_ctx)))

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

    _symlink_file(repository_ctx, repository_ctx.attr.yarn_lock)
    _copy_file(repository_ctx, repository_ctx.attr.package_json)
    _copy_data_dependencies(repository_ctx)
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

    _symlink_node_modules(repository_ctx)

    _create_build_files(repository_ctx, "yarn_install", node, repository_ctx.attr.yarn_lock, repository_ctx.attr.generate_local_modules_build_files)

yarn_install = repository_rule(
    attrs = dict(COMMON_ATTRIBUTES, **{
        "args": attr.string_list(
            doc = """Arguments passed to yarn install.

See yarn CLI docs https://yarnpkg.com/en/docs/cli/install for complete list of supported arguments.""",
            default = [],
        ),
        "frozen_lockfile": attr.bool(
            default = True,
            doc = """Use the `--frozen-lockfile` flag for yarn.

Don't generate a `yarn.lock` lockfile and fail if an update is needed.

This flag enables an exact install of the version that is specified in the `yarn.lock`
file. This helps to have reproducible builds across builds.

To update a dependency or install a new one run the `yarn install` command with the
vendored yarn binary. `bazel run @nodejs//:yarn install`. You can pass the options like
`bazel run @nodejs//:yarn install -- -D <dep-name>`.
""",
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

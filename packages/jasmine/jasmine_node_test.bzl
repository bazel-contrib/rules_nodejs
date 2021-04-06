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

"""NodeJS testing

These rules let you run tests outside of a browser. This is typically faster
than launching a test in Karma, for example.
"""

load("@build_bazel_rules_nodejs//:providers.bzl", "JSModuleInfo")
load("@build_bazel_rules_nodejs//internal/node:node.bzl", "nodejs_test")

def _js_sources_impl(ctx):
    depsets = []
    for src in ctx.attr.srcs:
        if JSModuleInfo in src:
            provider = src[JSModuleInfo]
            files = provider.direct_sources if ctx.attr.use_direct_specs else provider.sources
            depsets.append(files)
        if hasattr(src, "files"):
            depsets.append(src.files)
    sources = depset(transitive = depsets)

    ctx.actions.write(ctx.outputs.manifest, "".join([
        f.short_path + "\n"
        for f in sources.to_list()
        if f.path.endswith(".js") or f.path.endswith(".mjs")
    ]))

    return [DefaultInfo(files = sources)]

"""Rule to get js sources from deps.

Outputs a manifest file with the sources listed.
"""
_js_sources = rule(
    implementation = _js_sources_impl,
    attrs = {
        "srcs": attr.label_list(
            allow_files = True,
        ),
        "use_direct_specs": attr.bool(),
    },
    outputs = {
        "manifest": "%{name}.MF",
    },
)

def jasmine_node_test(
        name,
        srcs = [],
        data = [],
        deps = [],
        expected_exit_code = 0,
        tags = [],
        config_file = None,
        use_direct_specs = None,
        # Replaced by pkg_npm with jasmine = "//@bazel/jasmine",
        jasmine = "//packages/jasmine",
        # Replaced by pkg_npm with jasmine_entry_point = "//:node_modules/@bazel/jasmine/jasmine_runner.js",
        jasmine_entry_point = "//packages/jasmine:jasmine_runner.js",
        **kwargs):
    """Runs tests in NodeJS using the Jasmine test runner.

    Detailed XML test results are found in the standard `bazel-testlogs`
    directory. This may be symlinked in your workspace.
    See https://docs.bazel.build/versions/master/output_directories.html

    To debug the test, see debugging notes in `nodejs_test`.

    Args:
      name: Name of the resulting label
      srcs: JavaScript source files containing Jasmine specs
      data: Runtime dependencies which will be loaded while the test executes
      deps: Other targets which produce JavaScript, such as ts_library
      expected_exit_code: The expected exit code for the test.
      tags: Bazel tags applied to test
      config_file: (experimental) label of a file containing Jasmine JSON config.

        Note that not all configuration options are honored, and
        we expect some strange feature interations.
        For example, the filter for which files are instrumented for
        code coverage doesn't understand the spec_files setting in the config.

        See https://jasmine.github.io/setup/nodejs.html#configuration

      use_direct_specs: Limits the list of specs added to the execution (test suite) to direct sources.

        Note that this is a bug fix opt-in flag, which will be the default
        behavior in the next major release.

        More info: https://github.com/bazelbuild/rules_nodejs/pull/2576

      jasmine: A label providing the `@bazel/jasmine` npm dependency.
      jasmine_entry_point: A label providing the `@bazel/jasmine` entry point.
      **kwargs: Remaining arguments are passed to the test rule
    """
    if kwargs.pop("coverage", False):
        fail("The coverage attribute has been removed, run your target with \"bazel coverage\" instead")

    _js_sources(
        name = "%s_js_sources" % name,
        srcs = srcs if use_direct_specs else (srcs + deps),
        testonly = 1,
        tags = tags,
        use_direct_specs = use_direct_specs,
    )

    all_data = data + srcs + deps + [Label(jasmine)]

    # BEGIN-INTERNAL
    # Only used when running tests in the rules_nodejs repo.
    # Avoid adding duplicate deps though, some rules use this from source and declared the dep
    if not "@npm//jasmine" in all_data and not str(Label("@npm//jasmine")) in all_data and not "no-local-jasmine-deps" in tags:
        all_data.extend(["@npm//jasmine", "@npm//jasmine-reporters", "@npm//c8"])

    # END-INTERNAL
    all_data += [":%s_js_sources.MF" % name]
    all_data += [Label("@build_bazel_rules_nodejs//third_party/github.com/bazelbuild/bazel/tools/bash/runfiles")]

    # jasmine_runner.js consumes the first 3 args.
    # The remaining target templated_args will be passed through to jasmine or
    # specs to consume.
    templated_args = [
        "$(rootpath :%s_js_sources.MF)" % name,
        "$(rootpath %s)" % config_file if config_file else "--noconfig",
    ] + kwargs.pop("templated_args", [])

    if config_file:
        # Calculate a label relative to the user's BUILD file
        pkg = Label("%s//%s:__pkg__" % (native.repository_name(), native.package_name()))
        all_data.append(pkg.relative(config_file))

    nodejs_test(
        name = name,
        data = all_data,
        entry_point = Label(jasmine_entry_point),
        templated_args = templated_args,
        testonly = 1,
        expected_exit_code = expected_exit_code,
        tags = tags,
        **kwargs
    )

# Copyright 2018 The Bazel Authors. All rights reserved.
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

"""Package file which defines build_bazel_rules_typescript dependencies
"""

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

def rules_typescript_dependencies():
    print("""DEPRECATION WARNING:
    rules_typescript_dependencies is no longer needed, and will be removed in a future release.
    We assume you will fetch rules_nodejs in your WORKSPACE file, and no other dependencies remain here.
    Simply remove any calls to this function and the corresponding call to
      load("@build_bazel_rules_typescript//:package.bzl", "rules_typescript_dependencies")
    """)

def rules_typescript_dev_dependencies():
    """
    Fetch dependencies needed for local development.

    These are in this file to keep version information in one place, and make the WORKSPACE
    shorter.

    Also this allows other repos to reference our sources with local_repository and install the needed deps.
    """

    _maybe(
        http_archive,
        name = "build_bazel_rules_nodejs",
        strip_prefix = "rules_nodejs-0.16.8",
        urls = ["https://github.com/bazelbuild/rules_nodejs/archive/0.16.8.zip"],
    )

    # For running skylint
    _maybe(
        http_archive,
        name = "io_bazel",
        urls = ["https://github.com/bazelbuild/bazel/releases/download/0.21.0/bazel-0.21.0-dist.zip"],
        sha256 = "6ccb831e683179e0cfb351cb11ea297b4db48f9eab987601c038aa0f83037db4",
    )

    # For building ts_devserver and ts_auto_deps binaries
    # See https://github.com/bazelbuild/rules_go#setup for the latest version.
    _maybe(
        http_archive,
        name = "io_bazel_rules_go",
        # We need https://github.com/bazelbuild/rules_go/commit/109c520465fcb418f2c4be967f3744d959ad66d3 which
        # is not part of any 0.16.x release yet. This commit provides runfile resolve support for Windows.
        urls = ["https://github.com/bazelbuild/rules_go/archive/12a52e9845a5b06a28ffda06d7f2b07ff2320b97.zip"],
        strip_prefix = "rules_go-12a52e9845a5b06a28ffda06d7f2b07ff2320b97",
        sha256 = "5c0a059afe51c744c90ae2b33ac70b9b4f4c514715737e2ec0b5fd297400c10d",
    )

    # go_repository is defined in bazel_gazelle
    _maybe(
        http_archive,
        name = "bazel_gazelle",
        urls = ["https://github.com/bazelbuild/bazel-gazelle/archive/c0880f7f9d7048b45be5d36115ec2bf444e723c4.zip"],  # 2018-12-05
        strip_prefix = "bazel-gazelle-c0880f7f9d7048b45be5d36115ec2bf444e723c4",
        sha256 = "d9980ae0c91d90aaf9131170adfec4e87464d53e58ce2eb01b350a53e93a87c7",
    )

    # ts_auto_deps depends on com_github_bazelbuild_buildtools
    _maybe(
        http_archive,
        name = "com_github_bazelbuild_buildtools",
        url = "https://github.com/bazelbuild/buildtools/archive/0.19.2.1.zip",
        strip_prefix = "buildtools-0.19.2.1",
        sha256 = "9176a7df34dbed2cf5171eb56271868824560364e60644348219f852f593ae79",
    )

    # io_bazel_rules_webtesting depends on bazel_skylib. It is installed by
    # web_test_repositories() but we depend on it here in case users don't call
    # web_test_repositories(). This will get cleaned up by https://github.com/bazelbuild/rules_typescript/pull/374
    # which introduces build_bazel_rules_karma with its own defs.bzl file
    # that will allow this dep to be removed from rules_typescript_dependencies()
    _maybe(
        http_archive,
        name = "bazel_skylib",
        url = "https://github.com/bazelbuild/bazel-skylib/archive/d7c5518fa061ae18a20d00b14082705d3d2d885d.zip",
        strip_prefix = "bazel-skylib-d7c5518fa061ae18a20d00b14082705d3d2d885d",
    )

    #############################################
    # Dependencies for generating documentation #
    #############################################

    http_archive(
        name = "io_bazel_rules_sass",
        urls = ["https://github.com/bazelbuild/rules_sass/archive/8ccf4f1c351928b55d5dddf3672e3667f6978d60.zip"],  # 2018-11-23
        strip_prefix = "rules_sass-8ccf4f1c351928b55d5dddf3672e3667f6978d60",
        sha256 = "894d7928df8da85e263d743c8434d4c10ab0a3f0708fed0d53394e688e3faf70",
    )

    http_archive(
        name = "io_bazel_skydoc",
        url = "https://github.com/bazelbuild/skydoc/archive/82fdbfe797c6591d8732df0c0389a2b1c3e50992.zip",  # 2018-12-12
        strip_prefix = "skydoc-82fdbfe797c6591d8732df0c0389a2b1c3e50992",
        sha256 = "75fd965a71ca1f0d0406d0d0fb0964d24090146a853f58b432761a1a6c6b47b9",
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)

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

"""Dependency-related rules defining our dependency versions.

Fulfills similar role as the package.json file.
"""

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

def rules_nodejs_dev_dependencies():
    """
    Fetch dependencies needed for local development, but not needed by users.

    These are in this file to keep version information in one place, and make the WORKSPACE
    shorter.
    """

    # Dependencies for generating documentation
    _maybe(
        http_archive,
        name = "io_bazel_rules_sass",
        patch_args = ["-p1"],
        # We need the latest rules_sass to get the --bazel_patch_module_resolver behavior
        # However it seems to have a bug, so we patch back to the prior dart-sass version.
        # See https://github.com/bazelbuild/rules_sass/issues/127
        # TODO(alexeagle): fix upstream and remove patch
        patches = ["@build_bazel_rules_nodejs//:rules_sass.issue127.patch"],
        sha256 = "8392cf8910db2b1dc3b488ea18113bfe4fd666037bf8ec30d2a3f08fc602a6d8",
        strip_prefix = "rules_sass-1.30.0",
        urls = [
            "https://github.com/bazelbuild/rules_sass/archive/1.30.0.zip",
            "https://mirror.bazel.build/github.com/bazelbuild/rules_sass/archive/1.30.0.zip",
        ],
    )

    # Needed for com_google_protobuf
    _maybe(
        http_archive,
        name = "zlib",
        build_file = "@com_google_protobuf//:third_party/zlib.BUILD",
        sha256 = "c3e5e9fdd5004dcb542feda5ee4f0ff0744628baf8ed2dd5d66f8ca1197cb1a1",
        strip_prefix = "zlib-1.2.11",
        urls = [
            "https://mirror.bazel.build/zlib.net/zlib-1.2.11.tar.gz",
            "https://zlib.net/zlib-1.2.11.tar.gz",
        ],
    )

    _maybe(
        http_archive,
        name = "io_bazel_stardoc",
        sha256 = "04612d977b98896b5e0d3404b2aecf131d63a89fb5117640bf93f8158a647cdc",
        strip_prefix = "stardoc-e25bed3afae3ad494ffc15759749ba3b3d979747",
        urls = [
            # TODO: switch back to upstream after bazelbuild/bazel#12286 is merged and available in a stardoc release
            "https://github.com/alexeagle/stardoc/archive/e25bed3afae3ad494ffc15759749ba3b3d979747.tar.gz",
        ],
    )

    # bazel-skylib master 2019.05.03 to get support for https://github.com/bazelbuild/bazel-skylib/pull/140
    _maybe(
        http_archive,
        name = "bazel_skylib",
        sha256 = "afbe4d9d033c007940acd24bb9becf1580a0280ae0b2ebbb5a7cb12912d2c115",
        strip_prefix = "bazel-skylib-ffad33e9bfc60bdfa98292ca655a4e7035792046",
        urls = [
            "https://mirror.bazel.build/github.com/bazelbuild/bazel-skylib/archive/ffad33e9bfc60bdfa98292ca655a4e7035792046.tar.gz",
            "https://github.com/bazelbuild/bazel-skylib/archive/ffad33e9bfc60bdfa98292ca655a4e7035792046.tar.gz",
        ],
    )

    # Needed for Remote Build Execution
    # See https://releases.bazel.build/bazel-toolchains.html
    _maybe(
        http_archive,
        name = "bazel_toolchains",
        sha256 = "db48eed61552e25d36fe051a65d2a329cc0fb08442627e8f13960c5ab087a44e",
        strip_prefix = "bazel-toolchains-3.2.0",
        urls = [
            "https://mirror.bazel.build/github.com/bazelbuild/bazel-toolchains/releases/download/3.2.0/bazel-toolchains-3.2.0.tar.gz",
            "https://github.com/bazelbuild/bazel-toolchains/releases/download/3.2.0/bazel-toolchains-3.2.0.tar.gz",
        ],
    )

    _maybe(
        http_archive,
        name = "build_bazel_integration_testing",
        urls = [
            "https://github.com/bazelbuild/bazel-integration-testing/archive/165440b2dbda885f8d1ccb8d0f417e6cf8c54f17.zip",
        ],
        strip_prefix = "bazel-integration-testing-165440b2dbda885f8d1ccb8d0f417e6cf8c54f17",
        sha256 = "2401b1369ef44cc42f91dc94443ef491208dbd06da1e1e10b702d8c189f098e3",
    )

    _maybe(
        http_archive,
        name = "rules_codeowners",
        strip_prefix = "rules_codeowners-27fe3bbe6e5b0df196e360fc9e081835f22a10be",
        sha256 = "0aada1d5df72cb13161a78dff965e02575930f3ea9550e778f6fa45f3f4e2537",
        urls = [
            "https://github.com/zegl/rules_codeowners/archive/27fe3bbe6e5b0df196e360fc9e081835f22a10be.zip",
        ],
    )

    _maybe(
        http_archive,
        name = "rules_pkg",
        urls = [
            "https://github.com/bazelbuild/rules_pkg/releases/download/0.2.6-1/rules_pkg-0.2.6.tar.gz",
            "https://mirror.bazel.build/github.com/bazelbuild/rules_pkg/releases/download/0.2.6/rules_pkg-0.2.6.tar.gz",
        ],
        sha256 = "aeca78988341a2ee1ba097641056d168320ecc51372ef7ff8e64b139516a4937",
    )

    _maybe(
        http_archive,
        name = "io_bazel_rules_webtesting",
        sha256 = "9bb461d5ef08e850025480bab185fd269242d4e533bca75bfb748001ceb343c3",
        urls = ["https://github.com/bazelbuild/rules_webtesting/releases/download/0.3.3/rules_webtesting.tar.gz"],
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)

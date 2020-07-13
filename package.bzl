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
    http_archive(
        name = "io_bazel_rules_sass",
        sha256 = "c78be58f5e0a29a04686b628cf54faaee0094322ae0ac99da5a8a8afca59a647",
        strip_prefix = "rules_sass-1.25.0",
        urls = [
            "https://github.com/bazelbuild/rules_sass/archive/1.25.0.zip",
            "https://mirror.bazel.build/github.com/bazelbuild/rules_sass/archive/1.25.0.zip",
        ],
    )

    # Needed for com_google_protobuf
    http_archive(
        name = "zlib",
        build_file = "@com_google_protobuf//:third_party/zlib.BUILD",
        sha256 = "c3e5e9fdd5004dcb542feda5ee4f0ff0744628baf8ed2dd5d66f8ca1197cb1a1",
        strip_prefix = "zlib-1.2.11",
        urls = [
            "https://mirror.bazel.build/zlib.net/zlib-1.2.11.tar.gz",
            "https://zlib.net/zlib-1.2.11.tar.gz",
        ],
    )

    http_archive(
        name = "io_bazel_stardoc",
        # Workaround for https://github.com/bazelbuild/stardoc/issues/43
        patches = ["@build_bazel_rules_nodejs//:stardoc.patch"],
        sha256 = "6d07d18c15abb0f6d393adbd6075cd661a2219faab56a9517741f0fc755f6f3c",
        strip_prefix = "stardoc-0.4.0",
        urls = [
            "https://mirror.bazel.build/github.com/bazelbuild/stardoc/archive/0.4.0.tar.gz",
            "https://github.com/bazelbuild/stardoc/archive/0.4.0.tar.gz",
        ],
    )

    # bazel-skylib master 2019.05.03 to get support for https://github.com/bazelbuild/bazel-skylib/pull/140
    http_archive(
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
    http_archive(
        name = "bazel_toolchains",
        sha256 = "db48eed61552e25d36fe051a65d2a329cc0fb08442627e8f13960c5ab087a44e",
        strip_prefix = "bazel-toolchains-3.2.0",
        urls = [
            "https://mirror.bazel.build/github.com/bazelbuild/bazel-toolchains/releases/download/3.2.0/bazel-toolchains-3.2.0.tar.gz",
            "https://github.com/bazelbuild/bazel-toolchains/releases/download/3.2.0/bazel-toolchains-3.2.0.tar.gz",
        ],
    )

    http_archive(
        name = "build_bazel_integration_testing",
        urls = [
            "https://github.com/bazelbuild/bazel-integration-testing/archive/165440b2dbda885f8d1ccb8d0f417e6cf8c54f17.zip",
        ],
        strip_prefix = "bazel-integration-testing-165440b2dbda885f8d1ccb8d0f417e6cf8c54f17",
        sha256 = "2401b1369ef44cc42f91dc94443ef491208dbd06da1e1e10b702d8c189f098e3",
    )

    http_archive(
        name = "rules_codeowners",
        patches = ["@build_bazel_rules_nodejs//:rules_codeowners_pr27.patch"],
        strip_prefix = "rules_codeowners-bdc2f987cd0e15ebfa9b76689a4c9a472730a6f0",
        sha256 = "efd4aba15e25de49e9e68b1517d789c53104b2cf0b05212ce206ed0d44835952",
        urls = [
            "https://github.com/zegl/rules_codeowners/archive/bdc2f987cd0e15ebfa9b76689a4c9a472730a6f0.zip",
        ],
    )

    http_archive(
        name = "rules_pkg",
        urls = [
            "https://github.com/bazelbuild/rules_pkg/releases/download/0.2.6-1/rules_pkg-0.2.6.tar.gz",
            "https://mirror.bazel.build/github.com/bazelbuild/rules_pkg/releases/download/0.2.6/rules_pkg-0.2.6.tar.gz",
        ],
        sha256 = "aeca78988341a2ee1ba097641056d168320ecc51372ef7ff8e64b139516a4937",
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)

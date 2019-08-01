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

"""Dependency-related rules defining our version and dependency versions.

Fulfills similar role as the package.json file.
"""

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

def rules_nodejs_dependencies():
    print("""DEPRECATION WARNING:
    rules_nodejs_dependencies is no longer needed, and will be removed in a future release.
    Simply remove any calls to this function and the corresponding call to
      load("@build_bazel_rules_nodejs//:package.bzl", "rules_nodejs_dependencies")
    """)

def rules_nodejs_dev_dependencies():
    """
    Fetch dependencies needed for local development, but not needed by users.

    These are in this file to keep version information in one place, and make the WORKSPACE
    shorter.
    """

    # Dependencies for generating documentation
    http_archive(
        name = "io_bazel_rules_sass",
        sha256 = "4f05239080175a3f4efa8982d2b7775892d656bb47e8cf56914d5f9441fb5ea6",
        url = "https://github.com/bazelbuild/rules_sass/archive/86ca977cf2a8ed481859f83a286e164d07335116.zip",
        strip_prefix = "rules_sass-86ca977cf2a8ed481859f83a286e164d07335116",
    )

    # Needed for @com_github_bazelbuild_buildtools which is used by ts_auto_deps
    http_archive(
        name = "io_bazel",
        url = "https://github.com/bazelbuild/bazel/archive/0.28.1.tar.gz",
        strip_prefix = "bazel-0.28.1",
        sha256 = "a3d6a8ba4c6dce86d3b3387a23b04cbdf4c435a58120bd9842588d3845fe689c",
    )

    # Needed by stardoc
    http_archive(
        name = "com_google_protobuf",
        sha256 = "b404fe166de66e9a5e6dab43dc637070f950cdba2a8a4c9ed9add354ed4f6525",
        strip_prefix = "protobuf-b4f193788c9f0f05d7e0879ea96cd738630e5d51",
        # Commit from 2019-05-15, update to protobuf 3.8 when available.
        url = "https://github.com/protocolbuffers/protobuf/archive/b4f193788c9f0f05d7e0879ea96cd738630e5d51.zip",
    )

    # Needed for com_google_protobuf
    http_archive(
        name = "zlib",
        build_file = "@com_google_protobuf//:third_party/zlib.BUILD",
        sha256 = "c3e5e9fdd5004dcb542feda5ee4f0ff0744628baf8ed2dd5d66f8ca1197cb1a1",
        strip_prefix = "zlib-1.2.11",
        urls = ["https://zlib.net/zlib-1.2.11.tar.gz"],
    )

    http_archive(
        name = "io_bazel_skydoc",
        sha256 = "fdc34621839104b57363a258eab9d821b02ff7837923cfe7fb6fd67182780829",
        strip_prefix = "skydoc-41c28e43dffbae39c52dd4b91932d1209e5a8893",
        url = "https://github.com/bazelbuild/skydoc/archive/41c28e43dffbae39c52dd4b91932d1209e5a8893.tar.gz",
    )

    # bazel-skylib master 2019.05.03 to get support for https://github.com/bazelbuild/bazel-skylib/pull/140
    http_archive(
        name = "bazel_skylib",
        sha256 = "afbe4d9d033c007940acd24bb9becf1580a0280ae0b2ebbb5a7cb12912d2c115",
        strip_prefix = "bazel-skylib-ffad33e9bfc60bdfa98292ca655a4e7035792046",
        urls = ["https://github.com/bazelbuild/bazel-skylib/archive/ffad33e9bfc60bdfa98292ca655a4e7035792046.tar.gz"],
    )

    # Gross dep that leaked out of stardoc, see
    # https://github.com/bazelbuild/skydoc/commit/9283f6a44811423756ab898e98ce410029c12f7b#commitcomment-34488585
    http_archive(
        name = "rules_java",
        sha256 = "bc81f1ba47ef5cc68ad32225c3d0e70b8c6f6077663835438da8d5733f917598",
        strip_prefix = "rules_java-7cf3cefd652008d0a64a419c34c13bdca6c8f178",
        urls = [
            "https://mirror.bazel.build/github.com/bazelbuild/rules_java/archive/7cf3cefd652008d0a64a419c34c13bdca6c8f178.zip",
            "https://github.com/bazelbuild/rules_java/archive/7cf3cefd652008d0a64a419c34c13bdca6c8f178.zip",
        ],
    )

    # Needed for Remote Build Execution
    # See https://releases.bazel.build/bazel-toolchains.html
    http_archive(
        name = "bazel_toolchains",
        sha256 = "55abc3a76e3718e5835e621ee5ba4cb915b325688bbf8b32f3288f6a5c36d93a",
        strip_prefix = "bazel-toolchains-be10bee",
        urls = [
            "https://github.com/bazelbuild/bazel-toolchains/archive/be10bee.tar.gz",
        ],
    )

    http_archive(
        name = "build_bazel_integration_testing",
        url = "https://github.com/bazelbuild/bazel-integration-testing/archive/13a7d5112aaae5572544c609f364d430962784b1.zip",
        type = "zip",
        strip_prefix = "bazel-integration-testing-13a7d5112aaae5572544c609f364d430962784b1",
        sha256 = "8028ceaad3613404254d6b337f50dc52c0fe77522d0db897f093dd982c6e63ee",
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)

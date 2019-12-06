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
        sha256 = "617e444f47a1f3e25eb1b6f8e88a2451d54a2afdc7c50518861d9f706fc8baaa",
        urls = [
            "https://github.com/bazelbuild/rules_sass/archive/1.23.7.zip",
            "https://mirror.bazel.build/github.com/bazelbuild/rules_sass/archive/1.23.7.zip",
        ],
        strip_prefix = "rules_sass-1.23.7",
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
        sha256 = "ca8aa49ceb47e9bee04dd67f0bec0b010032b37ebbe67147b535237e801d9a87",
        strip_prefix = "bazel-toolchains-1.2.2",
        urls = [
            "https://mirror.bazel.build/github.com/bazelbuild/bazel-toolchains/releases/download/1.2.2/bazel-toolchains-1.2.2.tar.gz",
            "https://github.com/bazelbuild/bazel-toolchains/releases/download/1.2.2/bazel-toolchains-1.2.2.tar.gz",
        ],
    )

    http_archive(
        name = "build_bazel_integration_testing",
        urls = [
            "https://mirror.bazel.build/github.com/bazelbuild/bazel-integration-testing/archive/922d2b04bfb9721ab14ff6d26d4a8a6ab847aa07.zip",
            "https://github.com/bazelbuild/bazel-integration-testing/archive/922d2b04bfb9721ab14ff6d26d4a8a6ab847aa07.zip",
        ],
        strip_prefix = "bazel-integration-testing-922d2b04bfb9721ab14ff6d26d4a8a6ab847aa07",
        sha256 = "490554b98da4ce6e3e1e074e01b81e8440b760d4f086fccf50085a25528bf5cd",
    )

    http_archive(
        name = "rules_codeowners",
        strip_prefix = "rules_codeowners-826b742ee0d6703736c8c4f45fd07d65315cf599",
        sha256 = "64f64459b41201f7236880763e72de9384b237dfc44d61949520a2994bff18cd",
        urls = [
            "https://mirror.bazel.build/github.com/zegl/rules_codeowners/archive/826b742ee0d6703736c8c4f45fd07d65315cf599.zip",
            "https://github.com/zegl/rules_codeowners/archive/826b742ee0d6703736c8c4f45fd07d65315cf599.zip",
        ],
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)

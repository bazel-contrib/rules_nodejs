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
    # TODO(manekinekko): switch to https://github.com/bazelbuild/rules_sass/ when the changes have been released
    http_archive(
        name = "io_bazel_rules_sass",
        url = "https://github.com/manekinekko/rules_sass/archive/9862dfc96a4a1f66fe171ef5e043b29853e8445b.zip",
        strip_prefix = "rules_sass-9862dfc96a4a1f66fe171ef5e043b29853e8445b",
    )

    # Needed for stardoc
    # TODO(gregmagolan): switch to https://github.com/bazelbuild/bazel/archive/0.23.x.tar.gz when
    # the commit pulled here makes it into a release
    http_archive(
        name = "io_bazel",
        url = "https://github.com/bazelbuild/bazel/archive/1488f91fec238adacbd0517fcee15d8ec0599b8d.zip",
        sha256 = "f0dba27ac4e5145de7fc727229fe87f01399a1ef3c5225dc9b8c7e77156d91af",
        strip_prefix = "bazel-1488f91fec238adacbd0517fcee15d8ec0599b8d",
    )

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
        sha256 = "75fd965a71ca1f0d0406d0d0fb0964d24090146a853f58b432761a1a6c6b47b9",
        strip_prefix = "skydoc-82fdbfe797c6591d8732df0c0389a2b1c3e50992",
        url = "https://github.com/bazelbuild/skydoc/archive/82fdbfe797c6591d8732df0c0389a2b1c3e50992.zip",  # 2018-12-12
    )

    # bazel-skylib 0.8.0 released 2019.03.20 (https://github.com/bazelbuild/bazel-skylib/releases/tag/0.8.0)
    http_archive(
        name = "bazel_skylib",
        type = "tar.gz",
        url = "https://github.com/bazelbuild/bazel-skylib/releases/download/0.8.0/bazel-skylib.0.8.0.tar.gz",
        sha256 = "2ef429f5d7ce7111263289644d233707dba35e39696377ebab8b0bc701f7818e",
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

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)

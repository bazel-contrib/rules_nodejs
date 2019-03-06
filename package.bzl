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

load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")
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

    http_archive(
        name = "com_github_bazelbuild_buildtools",
        url = "https://github.com/bazelbuild/buildtools/archive/0.15.0.zip",
        strip_prefix = "buildtools-0.15.0",
        sha256 = "76d1837a86fa6ef5b4a07438f8489f00bfa1b841e5643b618e01232ba884b1fe",
    )

    http_archive(
        name = "io_bazel_rules_sass",
        url = "https://github.com/bazelbuild/rules_sass/archive/8ccf4f1c351928b55d5dddf3672e3667f6978d60.zip",  # 2018-11-23
        strip_prefix = "rules_sass-8ccf4f1c351928b55d5dddf3672e3667f6978d60",
        sha256 = "894d7928df8da85e263d743c8434d4c10ab0a3f0708fed0d53394e688e3faf70",
    )

    # Needed for stardoc
    git_repository(
        name = "io_bazel",
        commit = "1488f91fec238adacbd0517fcee15d8ec0599b8d",
        remote = "https://github.com/bazelbuild/bazel.git",
    )

    http_archive(
        name = "com_google_protobuf",
        sha256 = "9510dd2afc29e7245e9e884336f848c8a6600a14ae726adb6befdb4f786f0be2",
        strip_prefix = "protobuf-3.6.1.3",
        type = "zip",
        # v3.6.1.3 as of 2019-01-15
        urls = ["https://github.com/protocolbuffers/protobuf/archive/v3.6.1.3.zip"],
    )

    git_repository(
        name = "io_bazel_skydoc",
        remote = "https://github.com/bazelbuild/skydoc.git",
        commit = "13063139c7c2bca7c725f382fa1e78bdfe93c887",
    )

    # Needed for Remote Build Execution
    # See https://releases.bazel.build/bazel-toolchains.html
    http_archive(
        name = "bazel_toolchains",
        sha256 = "4b1468b254a572dbe134cc1fd7c6eab1618a72acd339749ea343bd8f55c3b7eb",
        strip_prefix = "bazel-toolchains-d665ccfa3e9c90fa789671bf4ef5f7c19c5715c4",
        urls = [
            "https://mirror.bazel.build/github.com/bazelbuild/bazel-toolchains/archive/d665ccfa3e9c90fa789671bf4ef5f7c19c5715c4.tar.gz",
            "https://github.com/bazelbuild/bazel-toolchains/archive/d665ccfa3e9c90fa789671bf4ef5f7c19c5715c4.tar.gz",
        ],
    )

    http_archive(
        name = "bazel_skylib",
        url = "https://github.com/bazelbuild/bazel-skylib/archive/0.6.0.zip",
        strip_prefix = "bazel-skylib-0.6.0",
        sha256 = "54ee22e5b9f0dd2b42eb8a6c1878dee592cfe8eb33223a7dbbc583a383f6ee1a",
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)

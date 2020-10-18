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

"""Package file which defines build dependencies
"""

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

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
        sha256 = "b6670f9f43faa66e3009488bbd909bc7bc46a5a9661a33f6bc578068d1837f37",
        urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/1.3.0/rules_nodejs-1.3.0.tar.gz"],
    )

    # For protocol buffers
    _maybe(
        http_archive,
        name = "io_bazel",
        urls = ["https://github.com/bazelbuild/bazel/releases/download/0.25.0/bazel-0.25.0-dist.zip"],
        sha256 = "f624fe9ca8d51de192655369ac538c420afb7cde16e1ad052554b582fff09287",
    )

    # For building ts_devserver binary
    # See https://github.com/bazelbuild/rules_go#setup for the latest version.
    _maybe(
        http_archive,
        name = "io_bazel_rules_go",
        patch_args = ["-p1"],
        patches = [
            # Patch out a breaking change to runfiles support library
            # See discussion on https://github.com/bazelbuild/rules_go/pull/2076
            "@build_bazel_rules_typescript//:revert_rules_go_commit_4442d82a001f378d0605cbbca3fb529979a1c3a6.patch",
            # This old SHA seems no longer available on go.googlesource.com?
            # Fetching @org_golang_x_tools; Cloning c8855242db9c1762032abe33c2dff50de3ec9d05 of https://go.googlesource.com/tools 99s
            "@build_bazel_rules_typescript//:replace_go_googlesource_com_remote.patch",
        ],
        sha256 = "8df59f11fb697743cbb3f26cfb8750395f30471e9eabde0d174c3aebc7a1cd39",
        urls = [
            "https://storage.googleapis.com/bazel-mirror/github.com/bazelbuild/rules_go/releases/download/0.19.1/rules_go-0.19.1.tar.gz",
            "https://github.com/bazelbuild/rules_go/releases/download/0.19.1/rules_go-0.19.1.tar.gz",
        ],
    )

    _maybe(
        http_archive,
        name = "com_google_protobuf",
        sha256 = "98e615d592d237f94db8bf033fba78cd404d979b0b70351a9e5aaff725398357",
        strip_prefix = "protobuf-3.9.1",
        urls = ["https://github.com/protocolbuffers/protobuf/archive/v3.9.1.tar.gz"],
    )

    # go_repository is defined in bazel_gazelle
    _maybe(
        http_archive,
        name = "bazel_gazelle",
        urls = [
            "https://mirror.bazel.build/github.com/bazelbuild/bazel-gazelle/releases/download/0.17.0/bazel-gazelle-0.17.0.tar.gz",
            "https://github.com/bazelbuild/bazel-gazelle/releases/download/0.17.0/bazel-gazelle-0.17.0.tar.gz",
        ],
        sha256 = "3c681998538231a2d24d0c07ed5a7658cb72bfb5fd4bf9911157c0e9ac6a2687",
    )

def _maybe(repo_rule, name, **kwargs):
    if not native.existing_rule(name):
        repo_rule(name = name, **kwargs)

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

workspace(name = "build_bazel_rules_nodejs")
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("//:package.bzl", "rules_nodejs_dependencies")

rules_nodejs_dependencies()

#
# Download Bazel toolchain dependencies as needed by build actions
#

http_archive(
    name = "io_bazel_rules_go",
    urls = [
        "http://mirror.bazel.build/github.com/bazelbuild/rules_go/releases/download/0.10.3/rules_go-0.10.3.tar.gz",
        "https://github.com/bazelbuild/rules_go/releases/download/0.10.3/rules_go-0.10.3.tar.gz"
    ],
    sha256 = "feba3278c13cde8d67e341a837f69a029f698d7a27ddbb2a202be7a10b22142a",
)

# This commit matches the version of buildifier in angular/ngcontainer
# If you change this, also check if it matches the version in the angular/ngcontainer
# version in /.circleci/config.yml
BAZEL_BUILDTOOLS_VERSION = "82b21607e00913b16fe1c51bec80232d9d6de31c"

http_archive(
    name = "com_github_bazelbuild_buildtools",
    url = "https://github.com/bazelbuild/buildtools/archive/%s.zip" % BAZEL_BUILDTOOLS_VERSION,
    strip_prefix = "buildtools-%s" % BAZEL_BUILDTOOLS_VERSION,
    sha256 = "edb24c2f9c55b10a820ec74db0564415c0cf553fa55e9fc709a6332fb6685eff",
)

http_archive(
    name = "io_bazel",
    url = "https://github.com/bazelbuild/bazel/releases/download/0.11.1/bazel-0.11.1-dist.zip",
    sha256 = "e8d762bcc01566fa50952c8028e95cfbe7545a39b8ceb3a0d0d6df33b25b333f",
)

http_archive(
    name = "bazel_gazelle",
    url = "https://github.com/bazelbuild/bazel-gazelle/releases/download/0.10.1/bazel-gazelle-0.10.1.tar.gz",
    sha256 = "d03625db67e9fb0905bbd206fa97e32ae9da894fe234a493e7517fd25faec914",
)

http_archive(
    name = "io_bazel_rules_sass",
    url = "https://github.com/bazelbuild/rules_sass/archive/0.0.3.zip",
    strip_prefix = "rules_sass-0.0.3",
    sha256 = "8fa98e7b48a5837c286a1ea254b5a5c592fced819ee9fe4fdd759768d97be868",
)

http_archive(
    name = "io_bazel_skydoc",
    url = "https://github.com/bazelbuild/skydoc/archive/0ef7695c9d70084946a3e99b89ad5a99ede79580.zip",
    strip_prefix = "skydoc-0ef7695c9d70084946a3e99b89ad5a99ede79580",
    sha256 = "491f9e142b870b18a0ec8eb3d66636eeceabe5f0c73025706c86f91a1a2acb4d",
)

#
# Load and install our dependencies downloaded above.
#

local_repository(
    name = "program_example",
    path = "examples/program",
)

local_repository(
    name = "packages_example",
    path = "examples/packages",
)

local_repository(
    name = "node_loader_e2e_no_preserve_symlinks",
    path = "internal/e2e/node_loader_no_preserve_symlinks",
)

local_repository(
    name = "node_loader_e2e_preserve_symlinks",
    path = "internal/e2e/node_loader_preserve_symlinks",
)

local_repository(
    name = "node_resolve_dep",
    path = "internal/test/node_resolve_dep",
)

load("//:defs.bzl", "node_repositories")

# Install a hermetic version of node.
# After this is run, these labels will be available:
# - NodeJS:
#   @nodejs//:node
# - NPM:
#   @nodejs//:npm
# - The yarn package manager:
#   @nodejs//:yarn
node_repositories(
    package_json = [
        "//:package.json",
        "//examples/rollup:package.json",
        "@program_example//:package.json",
        "//internal/test:package.json"
    ],
    preserve_symlinks = True,
)

# Now the user must run either
# bazel run @nodejs//:yarn
# or
# bazel run @nodejs//:npm

load("@packages_example//:setup_workspace.bzl", "packages_example_setup_workspace")

packages_example_setup_workspace()

load("@io_bazel_rules_go//go:def.bzl", "go_rules_dependencies", "go_register_toolchains")

go_rules_dependencies()
go_register_toolchains()

load("@io_bazel_rules_sass//sass:sass.bzl", "sass_repositories")
sass_repositories()

load("@io_bazel_skydoc//skylark:skylark.bzl", "skydoc_repositories")
skydoc_repositories()

http_archive(
    name = "bazel_toolchains",
    sha256 = "c3b08805602cd1d2b67ebe96407c1e8c6ed3d4ce55236ae2efe2f1948f38168d",
    strip_prefix = "bazel-toolchains-5124557861ebf4c0b67f98180bff1f8551e0b421",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/bazel-toolchains/archive/5124557861ebf4c0b67f98180bff1f8551e0b421.tar.gz",
        "https://github.com/bazelbuild/bazel-toolchains/archive/5124557861ebf4c0b67f98180bff1f8551e0b421.tar.gz",
    ],
)

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

load("//:defs.bzl", "node_repositories")

local_repository(
    name = "program_example",
    path = "examples/program",
)

local_repository(
    name = "packages_example",
    path = "examples/packages",
)

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

http_archive(
    name = "io_bazel_rules_go",
    url = "https://github.com/bazelbuild/rules_go/releases/download/0.7.1/rules_go-0.7.1.tar.gz",
    sha256 = "341d5eacef704415386974bc82a1783a8b7ffbff2ab6ba02375e1ca20d9b031c",
)

load("@io_bazel_rules_go//go:def.bzl", "go_rules_dependencies", "go_register_toolchains")

go_rules_dependencies()

go_register_toolchains()

http_archive(
    name = "io_bazel",
    url = "https://github.com/bazelbuild/bazel/releases/download/0.11.1/bazel-0.11.1-dist.zip",
    sha256 = "e8d762bcc01566fa50952c8028e95cfbe7545a39b8ceb3a0d0d6df33b25b333f",
)

#############################################
# Dependencies for generating documentation #
#############################################

http_archive(
    name = "io_bazel_rules_sass",
    url = "https://github.com/bazelbuild/rules_sass/archive/0.0.3.zip",
    strip_prefix = "rules_sass-0.0.3",
    sha256 = "8fa98e7b48a5837c286a1ea254b5a5c592fced819ee9fe4fdd759768d97be868",
)

load("@io_bazel_rules_sass//sass:sass.bzl", "sass_repositories")
sass_repositories()

http_archive(
    name = "bazel_skylib",
    url = "https://github.com/bazelbuild/bazel-skylib/archive/0.3.1.zip",
    strip_prefix = "bazel-skylib-0.3.1",
    sha256 = "95518adafc9a2b656667bbf517a952e54ce7f350779d0dd95133db4eb5c27fb1",
)

http_archive(
    name = "io_bazel_skydoc",
    url = "https://github.com/bazelbuild/skydoc/archive/0ef7695c9d70084946a3e99b89ad5a99ede79580.zip",
    strip_prefix = "skydoc-0ef7695c9d70084946a3e99b89ad5a99ede79580",
    sha256 = "491f9e142b870b18a0ec8eb3d66636eeceabe5f0c73025706c86f91a1a2acb4d",
)

load("@io_bazel_skydoc//skylark:skylark.bzl", "skydoc_repositories")
skydoc_repositories()

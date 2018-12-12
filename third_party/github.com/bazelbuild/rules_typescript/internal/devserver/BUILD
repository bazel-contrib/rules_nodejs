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

load("@bazel_tools//tools/build_defs/pkg:pkg.bzl", "pkg_tar")

licenses(["notice"])  # Apache 2.0

package(default_visibility = [
    "//third_party/bazel_rules/rules_typescript/internal:__subpackages__",
])

exports_files([
    # Exported to be consumed for generating skydoc.
    "ts_devserver.bzl",
])

filegroup(
    name = "source_tree",
    srcs = glob(["**/*"]),
)

# Do a simple replacement needed to make the local development differ from how
# our release is used.
# NB: doesn't work on Windows, so we have to release from Mac/Linux for now.
genrule(
    name = "patched_devserver_bzl",
    srcs = ["ts_devserver.bzl"],
    outs = ["patched/ts_devserver.bzl"],
    cmd = """sed 's#"//devserver:devserver"#"//devserver:server"#' < $< > $@""",
)

# Remove the "patched/" directory prefix so that the ts_devserver.bzl ends up in
# the same path in the final tar as it had in our local repo.
pkg_tar(
    name = "strip_workaround",
    srcs = [":patched_devserver_bzl"],
)

pkg_tar(
    name = "package",
    srcs = [
        "BUILD",
    ],
    package_dir = "devserver",
    deps = ["strip_workaround"],
    visibility = ["//internal:__pkg__"],
)

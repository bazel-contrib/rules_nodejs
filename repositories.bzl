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

load("@bazel_tools//tools/build_defs/repo:http.bzl", _http_archive = "http_archive")
load("@bazel_tools//tools/build_defs/repo:utils.bzl", "maybe")

def http_archive(**kwargs):
    maybe(_http_archive, **kwargs)

def rules_nodejs_dev_dependencies():
    """
    Fetch dependencies needed for local development, but not needed by users.

    These are in this file to keep version information in one place, and make the WORKSPACE
    shorter.
    """
    http_archive(
        name = "bazel_features",
        sha256 = "5ab1a90d09fd74555e0df22809ad589627ddff263cff82535815aa80ca3e3562",
        strip_prefix = "bazel_features-1.39.0",
        url = "https://github.com/bazel-contrib/bazel_features/releases/download/v1.39.0/bazel_features-v1.39.0.tar.gz",
    )

    http_archive(
        name = "bazel_skylib",
        sha256 = "bc283cdfcd526a52c3201279cda4bc298652efa898b10b4db0837dc51652756f",
        urls = ["https://github.com/bazelbuild/bazel-skylib/releases/download/1.7.1/bazel-skylib-1.7.1.tar.gz"],
    )

    http_archive(
        name = "bazel_lib",
        sha256 = "5c42b1547cd4fab56fb90f75295aaf6d9e4aed5b51bfcb2457e44b886204a6e2",
        strip_prefix = "bazel-lib-3.2.1",
        url = "https://github.com/bazel-contrib/bazel-lib/releases/download/v3.2.1/bazel-lib-v3.2.1.tar.gz",
    )

    http_archive(
        name = "buildifier_prebuilt",
        sha256 = "e31fe636a5004eb50b7b47ec31c3cea0afd597d14bb1991832aa213038837ecf",
        strip_prefix = "buildifier-prebuilt-8.0.0",
        urls = ["http://github.com/keith/buildifier-prebuilt/archive/8.0.0.tar.gz"],
    )

    http_archive(
        name = "rules_cc",
        sha256 = "458b658277ba51b4730ea7a2020efdf1c6dcadf7d30de72e37f4308277fa8c01",
        strip_prefix = "rules_cc-0.2.16",
        url = "https://github.com/bazelbuild/rules_cc/releases/download/0.2.16/rules_cc-0.2.16.tar.gz",
    )

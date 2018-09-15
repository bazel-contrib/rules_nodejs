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

"""Package file which defines build_bazel_rules_typescript version in skylark

check_rules_typescript_version can be used in downstream WORKSPACES to check
against a minimum dependent build_bazel_rules_typescript version.
"""

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# This version is synced with the version in package.json.
# It will be automatically synced via the npm "version" script
# that is run when running `npm version` during the release
# process. See `Releasing` section in README.md.
VERSION = "0.16.2"

def rules_typescript_dependencies():
    """
    Fetch our transitive dependencies.

    If the user wants to get a different version of these, they can just fetch it
    from their WORKSPACE before calling this function, or not call this function at all.
    """

    # TypeScript compiler runs on node.js runtime
    _maybe(
        http_archive,
        name = "build_bazel_rules_nodejs",
        urls = ["https://github.com/bazelbuild/rules_nodejs/archive/0.13.2.zip"],
        strip_prefix = "rules_nodejs-0.13.2",
        sha256 = "9a71783206b24665f7ec1be81ca4eec48bcf7e977d7d55dde1490cf27869fd0f",
    )

    # ts_web_test depends on the web testing rules to provision browsers.
    _maybe(
        http_archive,
        name = "io_bazel_rules_webtesting",
        urls = ["https://github.com/bazelbuild/rules_webtesting/archive/0.2.1.zip"],
        strip_prefix = "rules_webtesting-0.2.1",
        sha256 = "7d490aadff9b5262e5251fa69427ab2ffd1548422467cb9f9e1d110e2c36f0fa",
    )

    # ts_devserver depends on the Go rules.
    # See https://github.com/bazelbuild/rules_go#setup for the latest version.
    _maybe(
        http_archive,
        name = "io_bazel_rules_go",
        urls = ["https://github.com/bazelbuild/rules_go/releases/download/0.13.0/rules_go-0.13.0.tar.gz"],
        sha256 = "ba79c532ac400cefd1859cbc8a9829346aa69e3b99482cd5a54432092cbc3933",
    )

    # go_repository is defined in bazel_gazelle
    _maybe(
        http_archive,
        name = "bazel_gazelle",
        urls = ["https://github.com/bazelbuild/bazel-gazelle/releases/download/0.13.0/bazel-gazelle-0.13.0.tar.gz"],
        sha256 = "bc653d3e058964a5a26dcad02b6c72d7d63e6bb88d94704990b908a1445b8758",
    )

    ###############################################
    # Repeat the dependencies of rules_nodejs here!
    # We can't load() from rules_nodejs yet, because we've only just fetched it.
    # But we also don't want to make users load and call the rules_nodejs_dependencies
    # function because we can do that for them, mostly hiding the transitive dependency.
    _maybe(
        http_archive,
        name = "bazel_skylib",
        url = "https://github.com/bazelbuild/bazel-skylib/archive/0.3.1.zip",
        strip_prefix = "bazel-skylib-0.3.1",
        sha256 = "95518adafc9a2b656667bbf517a952e54ce7f350779d0dd95133db4eb5c27fb1",
    )

def rules_typescript_dev_dependencies():
    """
    Fetch dependencies needed for local development, but not needed by users.

    These are in this file to keep version information in one place, and make the WORKSPACE
    shorter.
    """
    http_archive(
        name = "io_bazel",
        urls = ["https://github.com/bazelbuild/bazel/releases/download/0.9.0/bazel-0.9.0-dist.zip"],
        sha256 = "efb28fed4ffcfaee653e0657f6500fc4cbac61e32104f4208da385676e76312a",
    )

    http_archive(
        name = "com_github_bazelbuild_buildtools",
        url = "https://github.com/bazelbuild/buildtools/archive/0.12.0.zip",
        strip_prefix = "buildtools-0.12.0",
        sha256 = "ec495cbd19238c9dc488fd65ca1fee56dcb1a8d6d56ee69a49f2ebe69826c261",
    )

    #############################################
    # Dependencies for generating documentation #
    #############################################

    http_archive(
        name = "io_bazel_rules_sass",
        urls = ["https://github.com/bazelbuild/rules_sass/archive/0.0.3.zip"],
        strip_prefix = "rules_sass-0.0.3",
        sha256 = "8fa98e7b48a5837c286a1ea254b5a5c592fced819ee9fe4fdd759768d97be868",
    )

    http_archive(
        name = "io_bazel_skydoc",
        urls = ["https://github.com/bazelbuild/skydoc/archive/0ef7695c9d70084946a3e99b89ad5a99ede79580.zip"],
        strip_prefix = "skydoc-0ef7695c9d70084946a3e99b89ad5a99ede79580",
        sha256 = "491f9e142b870b18a0ec8eb3d66636eeceabe5f0c73025706c86f91a1a2acb4d",
    )

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)

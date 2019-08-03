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

"""Rule for cloning external git repositories to test for bazel_integration_test
"""

load("//internal/node:node_labels.bzl", "get_node_label")
load("//third_party/github.com/bazelbuild/bazel:tools/build_defs/repo/git_worker.bzl", "git_repo")
load("//third_party/github.com/bazelbuild/bazel:tools/build_defs/repo/utils.bzl", "update_attrs")

def _clone_or_update(rctx):
    if ((not rctx.attr.tag and not rctx.attr.commit and not rctx.attr.branch) or
        (rctx.attr.tag and rctx.attr.commit) or
        (rctx.attr.tag and rctx.attr.branch) or
        (rctx.attr.commit and rctx.attr.branch)):
        fail("Exactly one of commit, tag, or branch must be provided")

    root = rctx.path(".")
    directory = str(root)
    if rctx.attr.strip_prefix:
        directory = directory + "-tmp"

    git_ = git_repo(rctx, directory)

    if rctx.attr.strip_prefix:
        dest_link = "{}/{}".format(directory, rctx.attr.strip_prefix)
        if not rctx.path(dest_link).exists:
            fail("strip_prefix at {} does not exist in repo".format(rctx.attr.strip_prefix))
        rctx.delete(root)
        rctx.symlink(dest_link, root)

    return {"commit": git_.commit, "shallow_since": git_.shallow_since}

def _update_git_attrs(orig, keys, override):
    result = update_attrs(orig, keys, override)

    # if we found the actual commit, remove all other means of specifying it,
    # like tag or branch.
    if "commit" in result:
        result.pop("tag", None)
        result.pop("branch", None)
    return result

_attrs = {
    "branch": attr.string(
        default = "",
        doc =
            "branch in the remote repository to checked out." +
            " Precisely one of branch, tag, or commit must be specified.",
    ),
    "commit": attr.string(
        default = "",
        doc =
            "specific commit to be checked out." +
            " Precisely one of branch, tag, or commit must be specified.",
    ),
    "init_submodules": attr.bool(
        default = False,
        doc = "Whether to clone submodules in the repository.",
    ),
    "remote": attr.string(
        mandatory = True,
        doc = "The URI of the remote Git repository",
    ),
    "shallow_since": attr.string(
        default = "",
        doc =
            "an optional date, not after the specified commit; the " +
            "argument is not allowed if a tag is specified (which allows " +
            "cloning with depth 1). Setting such a date close to the " +
            "specified commit allows for a more shallow clone of the " +
            "repository, saving bandwidth " +
            "and wall-clock time.",
    ),
    "strip_prefix": attr.string(
        default = "",
        doc = "A directory prefix to strip from the extracted files.",
    ),
    "tag": attr.string(
        default = "",
        doc =
            "tag in the remote repository to checked out." +
            " Precisely one of branch, tag, or commit must be specified.",
    ),
    "verbose": attr.bool(default = False),
}

def _configure(rctx):
    rctx.template(
        "_add_filegroup_targets.js",
        rctx.path(Label("//internal/bazel_integration_test:add_filegroup_targets.js")),
        {},
    )

    node = rctx.path(get_node_label(rctx))

    rctx.report_progress("Adding //:bazel_integration_test_files target")
    result = rctx.execute([node, "_add_filegroup_targets.js"])
    if result.return_code:
        fail("add_filegroup_targets.js failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

def _git_repository_under_test(rctx):
    update = _clone_or_update(rctx)
    rctx.delete(rctx.path(".git"))
    _configure(rctx)
    return _update_git_attrs(rctx.attr, _attrs.keys(), update)

git_repository_under_test = repository_rule(
    implementation = _git_repository_under_test,
    attrs = _attrs,
    doc = """Clone an external git repository to test with bazel_integration_test.

Clones a Git repository, checks out the specified tag, or commit, and
makes its targets available for binding. Also determine the id of the
commit actually checked out and its date, and return a dict with parameters
that provide a reproducible version of this rule (which a tag not necessarily
is).

Adds `//:bazel_integration_test_files` target to the cloned repository.
""",
)

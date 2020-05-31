# Copyright 2020 The Bazel Authors. All rights reserved.
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

"""Repository rule used to install cypress binary.
"""

load("@build_bazel_rules_nodejs//internal/node:node_labels.bzl", "get_node_label")

def _cypress_repository_impl(repository_ctx):
    node = repository_ctx.path(get_node_label(repository_ctx))

    cypress_install = "packages/cypress/internal/cypress-install.js"
    repository_ctx.template(
        cypress_install,
        repository_ctx.path(repository_ctx.attr._cypress_install),
        {},
    )

    repository_ctx.template(
        "packages/cypress/internal/cypress_web_test.bzl",
        repository_ctx.path(repository_ctx.attr._cypress_web_test),
        {
            "TEMPLATED_node_modules_workspace_name//": "@{}//".format(repository_ctx.attr.cypress_bin.workspace_name),
        },
    )

    exec_result = repository_ctx.execute(
        [node, cypress_install, repository_ctx.path(repository_ctx.attr.cypress_bin)],
        quiet = repository_ctx.attr.quiet,
    )

cypress_repository = repository_rule(
    implementation = _cypress_repository_impl,
    attrs = {
        "cypress_bin": attr.label(
            doc = "bazel target of the cypress binary",
            allow_single_file = True,
            default = "@npm//:node_modules/cypress/bin/cypress",
        ),
        "quiet": attr.bool(
            default = True,
            doc = "If stdout and stderr should be printed to the terminal",
        ),
        "_cypress_install": attr.label(
            allow_single_file = True,
            default = "//packages/cypress:internal/cypress-install.js",
        ),
        "_cypress_web_test": attr.label(
            allow_single_file = True,
            default = "//packages/cypress:internal/template.cypress_web_test.bzl",
        ),
    },
)

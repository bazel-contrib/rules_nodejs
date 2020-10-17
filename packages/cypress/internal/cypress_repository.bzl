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

load("@rules_nodejs//internal/node:node_labels.bzl", "get_node_label")

def _cypress_repository_impl(repository_ctx):
    node = repository_ctx.path(get_node_label(repository_ctx))

    install_cypress = "packages/cypress/internal/install-cypress.js"
    repository_ctx.template(
        install_cypress,
        repository_ctx.path(repository_ctx.attr._install_cypress),
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
        [node, install_cypress, repository_ctx.path(repository_ctx.attr.cypress_bin)],
        quiet = repository_ctx.attr.quiet,
    )

    if exec_result.return_code != 0 and repository_ctx.attr.fail_on_error:
        fail("\ncypress_repository exited with code: {}\n\nstdout:\n{}\n\nstderr:\n{}\n\n".format(exec_result.return_code, exec_result.stdout, exec_result.stderr))

cypress_repository = repository_rule(
    implementation = _cypress_repository_impl,
    attrs = {
        "cypress_bin": attr.label(
            doc = "bazel target of the cypress binary",
            allow_single_file = True,
            default = "@npm//:node_modules/cypress/bin/cypress",
        ),
        "fail_on_error": attr.bool(
            default = True,
            doc = "If the repository rule should allow errors",
        ),
        "quiet": attr.bool(
            default = True,
            doc = "If stdout and stderr should be printed to the terminal",
        ),
        "_cypress_web_test": attr.label(
            allow_single_file = True,
            default = "//packages/cypress:internal/template.cypress_web_test.bzl",
        ),
        "_install_cypress": attr.label(
            allow_single_file = True,
            default = "//packages/cypress:internal/install-cypress.js",
        ),
    },
)

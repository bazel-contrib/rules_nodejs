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

"""
Rule to build a Jekyll site and perform post processing

Influenced by the main bazel.build Jekyll rule here:
https://github.com/bazelbuild/bazel/blob/master/scripts/docs/jekyll.bzl
"""

load("@rules_pkg//:pkg.bzl", _pkg_tar = "pkg_tar")
load("//:index.bzl", _nodejs_binary = "nodejs_binary")

def _jekyll_impl(ctx):
    """non-hermetic rule to build a Jekyll site."""
    source = ctx.actions.declare_directory(ctx.attr.name + "-srcs")
    output = ctx.actions.declare_directory(ctx.attr.name + "-out")

    ctx.actions.run_shell(
        inputs = ctx.files.srcs,
        outputs = [source],
        command = ("mkdir -p %s\n" % (source.path)) +
                  "\n".join([
                      "tar xf %s -C %s" % (src.path, source.path)
                      for src in ctx.files.srcs
                  ]),
    )

    ctx.actions.run(
        inputs = [source],
        outputs = [output],
        executable = "jekyll",
        use_default_shell_env = True,
        arguments = ["build", "-q", "--trace", "-s", source.path, "-d", output.path],
    )

    # Create a shell script to serve the site locally
    ctx.actions.expand_template(
        template = ctx.file._jekyll_build_tpl,
        output = ctx.outputs.executable,
        substitutions = {
            "%{source_dir}": source.short_path,
            "%{workspace_name}": ctx.workspace_name,
        },
        is_executable = True,
    )

    return DefaultInfo(
        runfiles = ctx.runfiles(files = [source]),
        files = depset([output]),
    )

_jekyll = rule(
    implementation = _jekyll_impl,
    executable = True,
    attrs = {
        "srcs": attr.label_list(
            allow_empty = False,
            allow_files = [".tar"],
        ),
        "_jekyll_build_tpl": attr.label(
            default = "//tools/stardoc:jekyll_serve_tpl.sh",
            allow_single_file = True,
        ),
    },
)

def rules_nodejs_docs(name, layouts, includes, assets, css, readmes, docs, config, tags = []):
    """Generates HTML docs for rules_nodejs via Jekyll

    Args:
        name: Name for the docs
        layouts: files that correspond to the Jekyll _layouts directory
        includes: files that correspond to the Jekyll _includes directory
        assets: files that should exist with an images directory
        assets: files that should exist with an images directory
        css: css file to use for the docs
        readmes: dict of rules_nodejs package readme docs to their generating label
        docs: set of raw markdown doc files
        config: Jekyll configuration file
        tags: any tags to set on the Jekyll rule
    """

    _nodejs_binary(
        name = "post_process",
        data = ["//tools/stardoc:post-process-docs.js"],
        entry_point = "//tools/stardoc:post-process-docs.js",
    )

    [
        native.genrule(
            name = "%s_md" % readme[0],
            srcs = [readme[1]],
            outs = [readme[0] + ".md"],
            tools = [":post_process"],
            cmd = "$(location :post_process) $< %s >> $@" % readme[0],
        )
        for readme in readmes.items()
    ]

    # Jekyll doesn't follow symlinks, so package everything up into tar files
    # and allow the Jekyll rule extract them
    _pkg_tar(
        name = "%s_layouts" % name,
        srcs = layouts,
        package_dir = "_layouts",
    )

    _pkg_tar(
        name = "%s_includes" % name,
        srcs = includes,
        package_dir = "_includes",
    )

    _pkg_tar(
        name = "%s_css" % name,
        srcs = [css],
        package_dir = "css",
    )

    _pkg_tar(
        name = "%s_assets" % name,
        srcs = assets,
        package_dir = "images",
    )

    _pkg_tar(
        name = "%s_mds" % name,
        srcs = [s + ".md" for s in readmes.keys()] + [config] + docs,
    )

    _jekyll(
        name = name,
        srcs = [
            ":%s_layouts" % name,
            ":%s_includes" % name,
            ":%s_css" % name,
            ":%s_mds" % name,
            ":%s_assets" % name,
        ],
        tags = tags,
    )

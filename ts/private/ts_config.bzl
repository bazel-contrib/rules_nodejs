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

"tsconfig.json files using extends"

TsConfigInfo = provider(
    doc = """Provides TypeScript configuration, in the form of a tsconfig.json file
        along with any transitively referenced tsconfig.json files chained by the
        "extends" feature""",
    fields = {
        "deps": "all tsconfig.json files needed to configure TypeScript",
    },
)

def _tsconfig_inputs(ctx):
    """Returns all transitively referenced tsconfig files from "tsconfig" and "extends" attributes."""
    inputs = []
    if TsConfigInfo in ctx.attr.tsconfig:
        inputs.extend(ctx.attr.tsconfig[TsConfigInfo].deps)
    else:
        inputs.append(ctx.file.tsconfig)
    if hasattr(ctx.attr, "extends") and ctx.attr.extends:
        if TsConfigInfo in ctx.attr.extends:
            inputs.extend(ctx.attr.extends[TsConfigInfo].deps)
        else:
            inputs.extend(ctx.attr.extends.files.to_list())
    return inputs

def _ts_config_impl(ctx):
    files = depset([ctx.file.src])
    transitive_deps = []
    for dep in ctx.attr.deps:
        if TsConfigInfo in dep:
            transitive_deps.extend(dep[TsConfigInfo].deps)
    return [
        DefaultInfo(files = files),
        TsConfigInfo(deps = [ctx.file.src] + ctx.files.deps + transitive_deps),
    ]

def _join(*elements):
    return "/".join([f for f in elements if f])

def _relative_path(tsconfig, dest):
    relative_to = tsconfig.dirname
    if dest.is_source:
        # Calculate a relative path from the directory where we're writing the tsconfig
        # back to the sources root
        workspace_root = "/".join([".."] * len(relative_to.split("/")))
        return _join(workspace_root, dest.path)

    # Bazel guarantees that srcs are beneath the package directory, and we disallow
    # tsconfig.json being generated with a "/" in the name.
    # So we can calculate a relative path from e.g.
    # bazel-out/darwin-fastbuild/bin/packages/typescript/test/ts_project/generated_tsconfig/gen_src
    # to <generated file packages/typescript/test/ts_project/generated_tsconfig/gen_src/subdir/a.ts>
    result = dest.path[len(relative_to) + 1:]
    if not result.startswith("."):
        result = "./" + result
    return result

def _write_tsconfig_rule(ctx):
    # TODO: is it useful to expand Make variables in the content?
    content = "\n".join(ctx.attr.content)
    if ctx.attr.extends:
        content = content.replace(
            "__extends__",
            _relative_path(ctx.outputs.out, ctx.file.extends),
        )
    if ctx.attr.files:
        content = content.replace(
            "\"__files__\"",
            str([_relative_path(ctx.outputs.out, f) for f in ctx.files.files]),
        )
    ctx.actions.write(
        output = ctx.outputs.out,
        content = content,
    )
    return [DefaultInfo(files = depset([ctx.outputs.out]))]

write_tsconfig_rule = rule(
    implementation = _write_tsconfig_rule,
    attrs = {
        "content": attr.string_list(),
        "extends": attr.label(allow_single_file = True),
        "files": attr.label_list(allow_files = True),
        "out": attr.output(),
    },
)

# Syntax sugar around skylib's write_file
def write_tsconfig(name, config, files, out, extends = None):
    """Wrapper around bazel_skylib's write_file which understands tsconfig paths

    Args:
        name: name of the resulting write_file rule
        config: tsconfig dictionary
        files: list of input .ts files to put in the files[] array
        out: the file to write
        extends: a label for a tsconfig.json file to extend from, if any
    """
    if out.find("/") >= 0:
        fail("tsconfig should be generated in the package directory, to make relative pathing simple")

    if extends:
        config["extends"] = "__extends__"

    amended_config = struct(
        files = "__files__",
        **config
    )
    write_tsconfig_rule(
        name = name,
        files = files,
        extends = extends,
        content = [json.encode(amended_config)],
        out = out,
    )

lib = struct(
    tsconfig_inputs = _tsconfig_inputs,
    ts_config_impl = _ts_config_impl,
)

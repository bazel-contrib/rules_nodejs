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

"TypeScript compilation"

load("@build_bazel_rules_nodejs//:providers.bzl", "ExternalNpmPackageInfo", "LinkablePackageInfo", "js_ecma_script_module_info", "js_module_info", "js_named_module_info", "node_modules_aspect", "run_node")

# pylint: disable=unused-argument
# pylint: disable=missing-docstring
load("@build_bazel_rules_typescript//internal:common/compilation.bzl", "COMMON_ATTRIBUTES", "DEPS_ASPECTS", "compile_ts", "ts_providers_dict_to_struct")
load("@build_bazel_rules_typescript//internal:common/tsconfig.bzl", "create_tsconfig")
load("//packages/typescript/internal:ts_config.bzl", "TsConfigInfo")

_DOC = """type-check and compile a set of TypeScript sources to JavaScript.

It produces declarations files (`.d.ts`) which are used for compiling downstream
TypeScript targets and JavaScript for the browser and Closure compiler.

By default, `ts_library` uses the `tsconfig.json` file in the workspace root
directory. See the notes about the `tsconfig` attribute below.

## Serving TypeScript for development

`ts_library` is typically served by the concatjs_devserver rule, documented in the `@bazel/concatjs` package.

## Accessing JavaScript outputs

The default output of the `ts_library` rule is the `.d.ts` files.
This is for a couple reasons:

- help ensure that downstream rules which access default outputs will not require
  a cascading re-build when only the implementation changes but not the types
- make you think about whether you want the `devmode` (named `UMD`) or `prodmode` outputs

You can access the JS output by adding a `filegroup` rule after the `ts_library`,
for example

```python
ts_library(
    name = "compile",
    srcs = ["thing.ts"],
)

filegroup(
    name = "thing.js",
    srcs = ["compile"],
    # Change to es6_sources to get the 'prodmode' JS
    output_group = "es5_sources",
)

my_rule(
    name = "uses_js",
    deps = ["thing.js"],
)
```

"""

# NB: substituted with "//@bazel/typescript/bin:tsc_wrapped" in the pkg_npm rule
_DEFAULT_COMPILER = "@build_bazel_rules_typescript//internal:tsc_wrapped_bin"

_TYPESCRIPT_TYPINGS = Label(
    # BEGIN-INTERNAL
    "@npm" +
    # END-INTERNAL
    "//typescript:typescript__typings",
)

_TYPESCRIPT_SCRIPT_TARGETS = ["es3", "es5", "es2015", "es2016", "es2017", "es2018", "es2019", "es2020", "esnext"]
_TYPESCRIPT_MODULE_KINDS = ["none", "commonjs", "amd", "umd", "system", "es2015", "esnext"]

_DEVMODE_TARGET_DEFAULT = "es2015"
_DEVMODE_MODULE_DEFAULT = "umd"
_PRODMODE_TARGET_DEFAULT = "es2015"
_PRODMODE_MODULE_DEFAULT = "esnext"

def _trim_package_node_modules(package_name):
    # trim a package name down to its path prior to a node_modules
    # segment. 'foo/node_modules/bar' would become 'foo' and
    # 'node_modules/bar' would become ''
    segments = []
    for n in package_name.split("/"):
        if n == "node_modules":
            break
        segments += [n]
    return "/".join(segments)

def _compute_node_modules_root(ctx):
    """Computes the node_modules root from the node_modules and deps attributes.

    Args:
      ctx: the skylark execution context

    Returns:
      The node_modules root as a string
    """
    node_modules_root = None
    for d in ctx.attr.deps:
        if ExternalNpmPackageInfo in d:
            possible_root = "/".join(["external", d[ExternalNpmPackageInfo].workspace, "node_modules"])
            if not node_modules_root:
                node_modules_root = possible_root
            elif node_modules_root != possible_root:
                fail("All npm dependencies need to come from a single workspace. Found '%s' and '%s'." % (node_modules_root, possible_root))
    if not node_modules_root:
        # there are no fine grained deps but we still need a node_modules_root even if its empty
        node_modules_root = "/".join(["external", ctx.attr._typescript_typings[ExternalNpmPackageInfo].workspace, "node_modules"])
    return node_modules_root

def _filter_ts_inputs(all_inputs):
    return [
        f
        for f in all_inputs
        if f.extension in ["js", "jsx", "ts", "tsx", "json", "proto"]
    ]

def _compile_action(ctx, inputs, outputs, tsconfig_file, node_opts, description = "prodmode"):
    externs_files = []
    action_inputs = inputs
    action_outputs = []
    for output in outputs:
        if output.basename.endswith(".externs.js"):
            externs_files.append(output)
        elif output.basename.endswith(".es5.MF"):
            ctx.actions.write(output, content = "")
        else:
            action_outputs.append(output)

    # TODO(plf): For now we mock creation of files other than {name}.js.
    for externs_file in externs_files:
        ctx.actions.write(output = externs_file, content = "")

    # A ts_library that has only .d.ts inputs will have no outputs,
    # therefore there are no actions to execute
    if not action_outputs:
        return None

    action_inputs.extend(_filter_ts_inputs(ctx.attr._typescript_typings[ExternalNpmPackageInfo].sources.to_list()))

    # Also include files from npm fine grained deps as action_inputs.
    # These deps are identified by the ExternalNpmPackageInfo provider.
    for d in ctx.attr.deps:
        if ExternalNpmPackageInfo in d:
            # Note: we can't avoid calling .to_list() on sources
            action_inputs.extend(_filter_ts_inputs(d[ExternalNpmPackageInfo].sources.to_list()))

    if ctx.file.tsconfig:
        action_inputs.append(ctx.file.tsconfig)
        if TsConfigInfo in ctx.attr.tsconfig:
            action_inputs.extend(ctx.attr.tsconfig[TsConfigInfo].deps)

    # Pass actual options for the node binary in the special "--node_options" argument.
    arguments = ["--node_options=%s" % opt for opt in node_opts]

    # We don't try to use the linker to launch the worker process
    # because it causes bazel to spawn a new worker for every action
    # See https://github.com/bazelbuild/rules_nodejs/issues/1803
    # TODO: understand the interaction between linker and workers better
    if ctx.attr.supports_workers:
        # One at-sign makes this a params-file, enabling the worker strategy.
        # Two at-signs escapes the argument so it's passed through to tsc_wrapped
        # rather than the contents getting expanded.
        arguments.append("@@" + tsconfig_file.path)

        # Spawn a plain action that runs worker process with no linker
        ctx.actions.run(
            progress_message = "Compiling TypeScript (%s) %s" % (description, ctx.label),
            mnemonic = "TypeScriptCompile",
            inputs = action_inputs,
            outputs = action_outputs,
            # Use the built-in shell environment
            # Allow for users who set a custom shell that can locate standard binaries like tr and uname
            # See https://github.com/NixOS/nixpkgs/issues/43955#issuecomment-407546331
            use_default_shell_env = True,
            arguments = arguments,
            executable = ctx.executable.compiler,
            execution_requirements = {
                "supports-workers": "1",
            },
            env = {"COMPILATION_MODE": ctx.var["COMPILATION_MODE"]},
        )
    else:
        # TODO: if compiler is vanilla tsc, then we need the '-p' argument too
        # arguments.append("-p")
        arguments.append(tsconfig_file.path)

        # Run with linker but not as a worker process
        run_node(
            ctx,
            progress_message = "Compiling TypeScript (%s) %s" % (description, ctx.label),
            mnemonic = "tsc",
            inputs = action_inputs,
            outputs = action_outputs,
            # Use the built-in shell environment
            # Allow for users who set a custom shell that can locate standard binaries like tr and uname
            # See https://github.com/NixOS/nixpkgs/issues/43955#issuecomment-407546331
            use_default_shell_env = True,
            arguments = arguments,
            executable = "compiler",
            env = {"COMPILATION_MODE": ctx.var["COMPILATION_MODE"]},
            link_workspace_root = ctx.attr.link_workspace_root,
        )

    # Enable the replay_params in case an aspect needs to re-build this library.
    return struct(
        label = ctx.label,
        tsconfig = tsconfig_file,
        inputs = action_inputs,
        outputs = action_outputs,
        compiler = ctx.executable.compiler,
    )

def _devmode_compile_action(ctx, inputs, outputs, tsconfig_file, node_opts):
    _compile_action(
        ctx,
        inputs,
        outputs,
        tsconfig_file,
        node_opts,
        description = "devmode",
    )

def tsc_wrapped_tsconfig(
        ctx,
        files,
        srcs,
        devmode_manifest = None,
        jsx_factory = None,
        **kwargs):
    """Produce a tsconfig.json that sets options required under Bazel.

    Args:
      ctx: the Bazel starlark execution context
      files: Labels of all TypeScript compiler inputs
      srcs: Immediate sources being compiled, as opposed to transitive deps
      devmode_manifest: path to the manifest file to write for --target=es5
      jsx_factory: the setting for tsconfig.json compilerOptions.jsxFactory
      **kwargs: remaining args to pass to the create_tsconfig helper

    Returns:
      The generated tsconfig.json as an object
    """

    # The location of tsconfig.json is interpreted as the root of the project
    # when it is passed to the TS compiler with the `-p` option:
    #   https://www.typescriptlang.org/docs/handbook/tsconfig-json.html.
    # Our tsconfig.json is in bazel-foo/bazel-out/local-fastbuild/bin/{package_path}
    # because it's generated in the execution phase. However, our source files are in
    # bazel-foo/ and therefore we need to strip some parent directories for each
    # f.path.

    node_modules_root = _compute_node_modules_root(ctx)
    config = create_tsconfig(
        ctx,
        # Filter out package.json files that are included in DeclarationInfo
        # tsconfig files=[] property should only be .ts/.d.ts
        [f for f in files if f.path.endswith(".ts") or f.path.endswith(".tsx")],
        srcs,
        devmode_manifest = devmode_manifest,
        node_modules_root = node_modules_root,
        **kwargs
    )
    config["bazelOptions"]["nodeModulesPrefix"] = node_modules_root

    # Control target & module via attributes
    if devmode_manifest:
        # NB: devmode target may still be overriden with a tsconfig bazelOpts.devmodeTargetOverride but that
        #     configuration settings will be removed in a future major release
        config["compilerOptions"]["target"] = ctx.attr.devmode_target if hasattr(ctx.attr, "devmode_target") else _DEVMODE_TARGET_DEFAULT
        config["compilerOptions"]["module"] = ctx.attr.devmode_module if hasattr(ctx.attr, "devmode_module") else _DEVMODE_MODULE_DEFAULT
    else:
        config["compilerOptions"]["target"] = ctx.attr.prodmode_target if hasattr(ctx.attr, "prodmode_target") else _PRODMODE_TARGET_DEFAULT
        config["compilerOptions"]["module"] = ctx.attr.prodmode_module if hasattr(ctx.attr, "prodmode_module") else _PRODMODE_MODULE_DEFAULT

    # It's fine for users to have types[] in their tsconfig.json to help the editor
    # know which of the node_modules/@types/* entries to include in the program.
    # But we don't want TypeScript to do any automatic resolution under tsc_wrapped
    # because when not run in a sandbox, it will scan the @types directory and find
    # entries that aren't in the action inputs.
    # See https://github.com/bazelbuild/rules_typescript/issues/449
    # This setting isn't shared with g3 because there is no node_modules directory there.
    config["compilerOptions"]["types"] = []

    # If the user gives a tsconfig attribute, the generated file should extend
    # from the user's tsconfig.
    # See https://github.com/Microsoft/TypeScript/issues/9876
    # We subtract the ".json" from the end before handing to TypeScript because
    # this gives extra error-checking.
    if ctx.file.tsconfig:
        workspace_path = config["compilerOptions"]["rootDir"]
        config["extends"] = "/".join([workspace_path, ctx.file.tsconfig.path[:-len(".json")]])

    if jsx_factory:
        config["compilerOptions"]["jsxFactory"] = jsx_factory

    return config

# ************ #
# ts_library   #
# ************ #

def _ts_library_impl(ctx):
    """Implementation of ts_library.

    Args:
      ctx: the context.

    Returns:
      the struct returned by the call to compile_ts.
    """
    ts_providers = compile_ts(
        ctx,
        is_library = True,
        compile_action = _compile_action,
        devmode_compile_action = _devmode_compile_action,
        tsc_wrapped_tsconfig = tsc_wrapped_tsconfig,
    )

    # Add in shared JS providers.
    # See design doc https://docs.google.com/document/d/1ggkY5RqUkVL4aQLYm7esRW978LgX3GUCnQirrk5E1C0/edit#
    # and issue https://github.com/bazelbuild/rules_nodejs/issues/57 for more details.
    ts_providers["providers"].extend([
        js_module_info(
            sources = ts_providers["typescript"]["es5_sources"],
            deps = ctx.attr.deps,
        ),
        js_named_module_info(
            sources = ts_providers["typescript"]["es5_sources"],
            deps = ctx.attr.deps,
        ),
        js_ecma_script_module_info(
            sources = ts_providers["typescript"]["es6_sources"],
            deps = ctx.attr.deps,
        ),
        # TODO: remove legacy "typescript" provider
        # once it is no longer needed.
    ])

    if ctx.attr.module_name:
        path = "/".join([p for p in [ctx.bin_dir.path, ctx.label.workspace_root, ctx.label.package] if p])
        ts_providers["providers"].append(LinkablePackageInfo(
            package_name = ctx.attr.module_name,
            path = path,
            files = ts_providers["typescript"]["es5_sources"],
            _tslibrary = True,
        ))

    return ts_providers_dict_to_struct(ts_providers)

ts_library = rule(
    _ts_library_impl,
    attrs = dict(COMMON_ATTRIBUTES, **{
        "angular_assets": attr.label_list(
            doc = """Additional files the Angular compiler will need to read as inputs.
            Includes .css and .html files""",
            allow_files = [".css", ".html"],
        ),
        "compiler": attr.label(
            doc = """Sets a different TypeScript compiler binary to use for this library.
For example, we use the vanilla TypeScript tsc.js for bootstrapping,
and Angular compilations can replace this with `ngc`.

The default ts_library compiler depends on the `//@bazel/typescript`
target which is setup for projects that use bazel managed npm deps and
install the @bazel/typescript npm package.

You can also use a custom compiler to increase the NodeJS heap size used for compilations.

To do this, declare your own binary for running `tsc_wrapped`, e.g.:

```python
nodejs_binary(
    name = "tsc_wrapped_bin",
    entry_point = "@npm//:node_modules/@bazel/typescript/internal/tsc_wrapped/tsc_wrapped.js",
    templated_args = [
        "--node_options=--max-old-space-size=2048",
    ],
    data = [
        "@npm//protobufjs",
        "@npm//source-map-support",
        "@npm//tsutils",
        "@npm//typescript",
        "@npm//@bazel/typescript",
    ],
)
```

then refer to that target in the `compiler` attribute.

Note that `nodejs_binary` targets generated by `npm_install`/`yarn_install` can include data dependencies
on packages which aren't declared as dependencies.
For example, if you use [tsickle](https://github.com/angular/tsickle) to generate Closure Compiler-compatible JS,
then it needs to be a data dependency of `tsc_wrapped` so that it can be loaded at runtime.
""",
            default = Label(_DEFAULT_COMPILER),
            allow_files = True,
            executable = True,
            cfg = "host",
        ),
        "deps": attr.label_list(
            aspects = DEPS_ASPECTS + [node_modules_aspect],
            doc = "Compile-time dependencies, typically other ts_library targets",
        ),
        "devmode_module": attr.string(
            doc = """Set the typescript `module` compiler option for devmode output.

This value will override the `module` option in the user supplied tsconfig.""",
            values = _TYPESCRIPT_MODULE_KINDS,
            default = _DEVMODE_MODULE_DEFAULT,
        ),
        "devmode_target": attr.string(
            doc = """Set the typescript `target` compiler option for devmode output.

This value will override the `target` option in the user supplied tsconfig.""",
            values = _TYPESCRIPT_SCRIPT_TARGETS,
            default = _DEVMODE_TARGET_DEFAULT,
        ),
        "internal_testing_type_check_dependencies": attr.bool(default = False, doc = "Testing only, whether to type check inputs that aren't srcs."),
        "link_workspace_root": attr.bool(
            doc = """Link the workspace root to the bin_dir to support absolute requires like 'my_wksp/path/to/file'.
    If source files need to be required then they can be copied to the bin_dir with copy_to_bin.""",
        ),
        "prodmode_module": attr.string(
            doc = """Set the typescript `module` compiler option for prodmode output.

This value will override the `module` option in the user supplied tsconfig.""",
            values = _TYPESCRIPT_MODULE_KINDS,
            default = _PRODMODE_MODULE_DEFAULT,
        ),
        "prodmode_target": attr.string(
            doc = """Set the typescript `target` compiler option for prodmode output.

This value will override the `target` option in the user supplied tsconfig.""",
            values = _TYPESCRIPT_SCRIPT_TARGETS,
            default = _PRODMODE_TARGET_DEFAULT,
        ),
        "srcs": attr.label_list(
            doc = "The TypeScript source files to compile.",
            allow_files = [".ts", ".tsx"],
            mandatory = True,
        ),
        "supports_workers": attr.bool(
            doc = """Intended for internal use only.

Allows you to disable the Bazel Worker strategy for this library.
Typically used together with the "compiler" setting when using a
non-worker aware compiler binary.""",
            default = True,
        ),

        # TODO(alexeagle): reconcile with google3: ts_library rules should
        # be portable across internal/external, so we need this attribute
        # internally as well.
        "tsconfig": attr.label(
            doc = """A tsconfig.json file containing settings for TypeScript compilation.
Note that some properties in the tsconfig are governed by Bazel and will be
overridden, such as `target` and `module`.

The default value is set to `//:tsconfig.json` by a macro. This means you must
either:

- Have your `tsconfig.json` file in the workspace root directory
- Use an alias in the root BUILD.bazel file to point to the location of tsconfig:
    `alias(name="tsconfig.json", actual="//path/to:tsconfig-something.json")`
    and also make the tsconfig.json file visible to other Bazel packages:
    `exports_files(["tsconfig.json"], visibility = ["//visibility:public"])`
- Give an explicit `tsconfig` attribute to all `ts_library` targets
            """,
            allow_single_file = True,
        ),
        "tsickle_typed": attr.bool(
            default = True,
            doc = "If using tsickle, instruct it to translate types to ClosureJS format",
        ),
        "use_angular_plugin": attr.bool(
            doc = """Run the Angular ngtsc compiler under ts_library""",
        ),
        "_typescript_typings": attr.label(
            default = _TYPESCRIPT_TYPINGS,
        ),
    }),
    outputs = {
        "tsconfig": "%{name}_tsconfig.json",
    },
    doc = _DOC,
)

def ts_library_macro(tsconfig = None, **kwargs):
    """Wraps `ts_library` to set the default for the `tsconfig` attribute.

    This must be a macro so that the string is converted to a label in the context of the
    workspace that declares the `ts_library` target, rather than the workspace that defines
    `ts_library`, or the workspace where the build is taking place.

    This macro is re-exported as `ts_library` in the public API.

    Args:
      tsconfig: the label pointing to a tsconfig.json file
      **kwargs: remaining args to pass to the ts_library rule
    """
    if not tsconfig:
        tsconfig = "//:tsconfig.json"

    # plugins generally require the linker
    # (unless the user statically linked them into the compiler binary)
    # Therefore we disable workers for them by default
    if "supports_workers" in kwargs.keys():
        supports_workers = kwargs.pop("supports_workers")
    else:
        uses_plugin = kwargs.get("use_angular_plugin", False)
        supports_workers = not uses_plugin

    ts_library(tsconfig = tsconfig, supports_workers = supports_workers, **kwargs)

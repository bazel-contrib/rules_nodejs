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

"""Used for compilation by the different implementations of build_defs.bzl.
"""

load(":common/module_mappings.bzl", "module_mappings_aspect")
load(":common/json_marshal.bzl", "json_marshal")

BASE_ATTRIBUTES = dict()

DEPS_ASPECTS = [
    module_mappings_aspect,
]

# Attributes shared by any typescript-compatible rule (ts_library, ng_module)
COMMON_ATTRIBUTES = dict(BASE_ATTRIBUTES, **{
    "deps": attr.label_list(aspects = DEPS_ASPECTS),
    "data": attr.label_list(
        default = [],
        allow_files = True,
        cfg = "data",
    ),
    # TODO(evanm): make this the default and remove the option.
    "runtime": attr.string(default="browser"),
    # Used to determine module mappings
    "module_name": attr.string(),
    "module_root": attr.string(),
    # TODO(radokirov): remove this attr when clutz is stable enough to consume
    # any closure JS code.
    "runtime_deps": attr.label_list(
        default = [],
        providers = ["js"],
    ),
    "_additional_d_ts": attr.label_list(
        allow_files = True,
    ),
    # Whether to generate externs.js from any "declare" statement.
    "generate_externs": attr.bool(default = True),
    # A list of diagnostics expected when compiling this library, in the form of
    # "diagnostic:regexp", e.g. "TS1234:failed to quizzle the .* wobble".
    # Useful to test for expected compilation errors.
    "expected_diagnostics": attr.string_list(),

})

COMMON_OUTPUTS = {
    # Allow the tsconfig.json to be generated without running compile actions.
    "tsconfig": "%{name}_tsconfig.json"
}

# TODO(plf): Enforce this at analysis time.
def assert_js_or_typescript_deps(ctx):
  for dep in ctx.attr.deps:
    if not hasattr(dep, "typescript") and not hasattr(dep, "js"):
      fail(
          ("%s is neither a TypeScript nor a JS producing rule." % dep.label) +
          "\nDependencies must be ts_library, ts_declaration, or " +
          # TODO(plf): Leaving this here for now, but this message does not
          # make sense in opensource.
          "JavaScript library rules (js_library, pinto_library, etc, but " +
          "also proto_library and some others).\n")

def _collect_dep_declarations(ctx):
  """Collects .d.ts files from typescript and javascript dependencies.

  Args:
    ctx: ctx.

  Returns:
    A struct of depsets for direct, transitive, passthrough and type-blacklisted declarations.
  """
  # .d.ts files from direct dependencies, ok for strict deps
  direct_deps_declarations = depset()
  # all reachable .d.ts files from dependencies.
  transitive_deps_declarations = depset([extra for extra in ctx.files._additional_d_ts])
  # .d.ts files whose types tsickle will not emit (used for ts_declaration(generate_externs=False).
  type_blacklisted_declarations = depset()

  for dep in ctx.attr.deps + getattr(ctx.attr, '_helpers', []):
    if hasattr(dep, "typescript"):
      direct_deps_declarations += dep.typescript.declarations
      transitive_deps_declarations += dep.typescript.transitive_declarations
      type_blacklisted_declarations += dep.typescript.type_blacklisted_declarations

  # .d.ts files that would be passed into the subsequent typescript compilations
  # TODO(radokirov): Merge with transitive_deps_declarations after iclutz lands.
  passthrough_declarations = depset(transitive=[transitive_deps_declarations])
  # If a tool like github.com/angular/clutz can create .d.ts from type annotated .js
  # its output will be collected here.

  return struct(
      direct=direct_deps_declarations,
      transitive=transitive_deps_declarations,
      passthrough=passthrough_declarations,
      type_blacklisted=type_blacklisted_declarations
  )

def _outputs(ctx, label):
  """Returns closure js, devmode js, and .d.ts output files.

  Args:
    ctx: ctx.
    label: Label. package label.

  Returns:
    A struct of file lists for different output types.
  """
  workspace_segments = label.workspace_root.split("/") if label.workspace_root else []
  package_segments = label.package.split("/") if label.package else []
  trim = len(workspace_segments) + len(package_segments)
  closure_js_files = []
  devmode_js_files = []
  declaration_files = []
  for input_file in ctx.files.srcs:
    if (input_file.short_path.endswith(".d.ts")):
      continue
    basename = "/".join(input_file.short_path.split("/")[trim:])
    dot = basename.rfind(".")
    basename = basename[:dot]
    closure_js_files += [ctx.new_file(basename + ".closure.js")]
    devmode_js_files += [ctx.new_file(basename + ".js")]
    declaration_files += [ctx.new_file(basename + ".d.ts")]
  return struct(
    closure_js = closure_js_files,
    devmode_js = devmode_js_files,
    declarations = declaration_files,
  )


def compile_ts(ctx,
               is_library,
               compile_action=None,
               devmode_compile_action=None,
               jsx_factory=None,
               tsc_wrapped_tsconfig=None,
               outputs=_outputs):
  """Creates actions to compile TypeScript code.

  This rule is shared between ts_library and ts_declaration.

  Args:
    ctx: ctx.
    is_library: boolean. False if only compiling .dts files.
    compile_action: function. Creates the compilation action.
    devmode_compile_action: function. Creates the compilation action
      for devmode.
    jsx_factory: optional string. Enables overriding jsx pragma.
    tsc_wrapped_tsconfig: function that produces a tsconfig object.
    outputs: function from a ctx to the expected compilation outputs.

  Returns:
    struct that will be returned by the rule implementation.
  """
  assert_js_or_typescript_deps(ctx)

  ### Collect srcs and outputs.
  srcs = ctx.files.srcs
  src_declarations = []  # d.ts found in inputs.
  tsickle_externs = []  # externs.js generated by tsickle, if any.
  has_sources = False

  # Validate the user inputs.
  for src in ctx.attr.srcs:
    if src.label.package != ctx.label.package:
      # Sources can be in sub-folders, but not in sub-packages.
      fail("Sources must be in the same package as the ts_library rule, " +
           "but %s is not in %s" % (src.label, ctx.label.package), "srcs")

    for f in src.files:
      has_sources = True
      if not is_library and not f.path.endswith(".d.ts"):
          fail("srcs must contain only type declarations (.d.ts files), " +
               "but %s contains %s" % (src.label, f.short_path), "srcs")
      if f.path.endswith(".d.ts"):
        src_declarations += [f]
        continue

  outs = outputs(ctx, ctx.label)
  transpiled_closure_js = outs.closure_js
  transpiled_devmode_js = outs.devmode_js
  gen_declarations = outs.declarations

  if has_sources and ctx.attr.runtime != "nodejs":
    # Note: setting this variable controls whether tsickle is run at all.
    tsickle_externs = [ctx.new_file(ctx.label.name + ".externs.js")]

  dep_declarations = _collect_dep_declarations(ctx)
  input_declarations = dep_declarations.transitive + src_declarations
  type_blacklisted_declarations = dep_declarations.type_blacklisted
  if not is_library and not ctx.attr.generate_externs:
    type_blacklisted_declarations += ctx.files.srcs

  # The list of output files. These are the files that are always built
  # (including e.g. if you "blaze build :the_target" directly).
  files = depset()

  # A manifest listing the order of this rule's *.ts files (non-transitive)
  # Only generated if the rule has any sources.
  devmode_manifest = None

  # Enable to produce a performance trace when compiling TypeScript to JS.
  # The trace file location will be printed as a build result and can be read
  # in Chrome's chrome://tracing/ UI.
  perf_trace = False
  if "TYPESCRIPT_PERF_TRACE_TARGET" in ctx.var:
    perf_trace = str(ctx.label) == ctx.var["TYPESCRIPT_PERF_TRACE_TARGET"]

  compilation_inputs = input_declarations + srcs
  tsickle_externs_path = tsickle_externs[0] if tsickle_externs else None

  # Calculate allowed dependencies for strict deps enforcement.
  allowed_deps = depset()
  # A target's sources may depend on each other,
  allowed_deps += srcs[:]
  # or on a .d.ts from a direct dependency
  allowed_deps += dep_declarations.direct

  tsconfig_es6 = tsc_wrapped_tsconfig(
      ctx,
      compilation_inputs,
      srcs,
      jsx_factory=jsx_factory,
      tsickle_externs=tsickle_externs_path,
      type_blacklisted_declarations=type_blacklisted_declarations,
      allowed_deps=allowed_deps)
  # Do not produce declarations in ES6 mode, tsickle cannot produce correct
  # .d.ts (or even errors) from the altered Closure-style JS emit.
  tsconfig_es6["compilerOptions"]["declaration"] = False
  tsconfig_es6["compilerOptions"].pop("declarationDir")
  outputs = transpiled_closure_js + tsickle_externs

  node_profile_args = []
  if perf_trace and has_sources:
    perf_trace_file = ctx.new_file(ctx.label.name + ".es6.trace")
    tsconfig_es6["bazelOptions"]["perfTracePath"] = perf_trace_file.path
    outputs.append(perf_trace_file)

    profile_file =  ctx.new_file(ctx.label.name + ".es6.v8.log")
    node_profile_args = ["--prof",
                         # Without nologfile_per_isolate, v8 embeds an
                         # unpredictable hash code in the file name, which
                         # doesn't work with blaze.
                         "--nologfile_per_isolate",
                         "--logfile=" + profile_file.path]
    outputs.append(profile_file)

    files += [perf_trace_file, profile_file]

  ctx.file_action(output=ctx.outputs.tsconfig,
                  content=json_marshal(tsconfig_es6))

  # Parameters of this compiler invocation in case we need to replay this with different
  # settings.
  replay_params = None

  if has_sources:
    inputs = compilation_inputs + [ctx.outputs.tsconfig]
    replay_params = compile_action(ctx, inputs, outputs, ctx.outputs.tsconfig,
                                   node_profile_args)

    devmode_manifest = ctx.new_file(ctx.label.name + ".es5.MF")
    tsconfig_json_es5 = ctx.new_file(ctx.label.name + "_es5_tsconfig.json")
    outputs = (
        transpiled_devmode_js + gen_declarations + [devmode_manifest])
    tsconfig_es5 = tsc_wrapped_tsconfig(ctx,
                                        compilation_inputs,
                                        srcs,
                                        jsx_factory=jsx_factory,
                                        devmode_manifest=devmode_manifest.path,
                                        allowed_deps=allowed_deps)
    node_profile_args = []
    if perf_trace:
      perf_trace_file = ctx.new_file(ctx.label.name + ".es5.trace")
      tsconfig_es5["bazelOptions"]["perfTracePath"] = perf_trace_file.path
      outputs.append(perf_trace_file)

      profile_file =  ctx.new_file(ctx.label.name + ".es5.v8.log")
      node_profile_args = ["--prof",
                           # Without nologfile_per_isolate, v8 embeds an
                           # unpredictable hash code in the file name, which
                           # doesn't work with blaze.
                           "--nologfile_per_isolate",
                           "--logfile=" + profile_file.path]
      outputs.append(profile_file)

      files += [perf_trace_file, profile_file]

    ctx.file_action(output=tsconfig_json_es5, content=json_marshal(
        tsconfig_es5))
    inputs = compilation_inputs + [tsconfig_json_es5]
    devmode_compile_action(ctx, inputs, outputs, tsconfig_json_es5,
                           node_profile_args)

  # TODO(martinprobst): Merge the generated .d.ts files, and enforce strict
  # deps (do not re-export transitive types from the transitive closure).
  transitive_decls = dep_declarations.passthrough + src_declarations + gen_declarations

  if is_library:
    es6_sources = depset(transpiled_closure_js + tsickle_externs)
    es5_sources = depset(transpiled_devmode_js)
  else:
    es6_sources = depset(tsickle_externs)
    es5_sources = depset(tsickle_externs)
    devmode_manifest = None

  # Downstream rules see the .d.ts files produced or declared by this rule.
  declarations = depset()
  declarations += gen_declarations
  declarations += src_declarations
  if not srcs:
    # Re-export sources from deps.
    # TODO(b/30018387): introduce an "exports" attribute.
    for dep in ctx.attr.deps:
      if hasattr(dep, "typescript"):
        declarations += dep.typescript.declarations
  files += declarations

  # If this is a ts_declaration, add tsickle_externs to the outputs list to
  # force compilation of d.ts files.  (tsickle externs are produced by running a
  # compilation over the d.ts file and extracting type information.)
  if not is_library:
    files += depset(tsickle_externs)

  transitive_es5_sources = depset()
  transitive_es6_sources = depset()
  for dep in ctx.attr.deps:
    if hasattr(dep, "typescript"):
      transitive_es5_sources = depset(transitive = [
          transitive_es5_sources,
          dep.typescript.transitive_es5_sources,
      ])
      transitive_es6_sources = depset(transitive = [
          transitive_es6_sources,
          dep.typescript.transitive_es6_sources,
      ])
  transitive_es5_sources = depset(transitive = [transitive_es5_sources, es5_sources])
  transitive_es6_sources = depset(transitive = [transitive_es6_sources, es6_sources])

  return {
      "files": files,
      "output_groups": {
          "es6_sources": es6_sources,
          "es5_sources": es5_sources,
      },
      "runfiles": ctx.runfiles(
          # Note: don't include files=... here, or they will *always* be built
          # by any dependent rule, regardless of whether it needs them.
          # But these attributes are needed to pass along any input runfiles:
          collect_default=True,
          collect_data=True,
      ),
      # TODO(martinprobst): Prune transitive deps, only re-export what's needed.
      "typescript": {
          "declarations": declarations,
          "transitive_declarations": transitive_decls,
          "es6_sources": es6_sources,
          "transitive_es6_sources": transitive_es6_sources,
          "es5_sources": es5_sources,
          "transitive_es5_sources": transitive_es5_sources,
          "devmode_manifest": devmode_manifest,
          "type_blacklisted_declarations": type_blacklisted_declarations,
          "tsickle_externs": tsickle_externs,
          "replay_params": replay_params,
      },
      # Expose the tags so that a Skylark aspect can access them.
      "tags": ctx.attr.tags,
      # Expose the module_name so that packaging rules can access it.
      # e.g. rollup_bundle under Bazel needs to convert this into a UMD global
      # name in the Rollup configuration.
      "module_name": ctx.attr.module_name,
      "instrumented_files": {
          "extensions": ["ts"],
          "source_attributes": ["srcs"],
          "dependency_attributes": ["deps", "runtime_deps"],
      },
  }

# Converts a dict to a struct, recursing into a single level of nested dicts.
# This allows users of compile_ts to modify or augment the returned dict before
# converting it to an immutable struct.
def ts_providers_dict_to_struct(d):
  for key, value in d.items():
    if key != "output_groups" and type(value) == type({}):
      d[key] = struct(**value)
  return struct(**d)

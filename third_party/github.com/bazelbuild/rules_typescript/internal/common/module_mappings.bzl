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

# Definitions for handling path re-mapping, to support short module names.
# See pathMapping doc: https://github.com/Microsoft/TypeScript/issues/5039
#
# This reads the module_root and module_name attributes from typescript rules in
# the transitive closure, rolling these up to provide a mapping to the
# TypeScript compiler and to editors.
#
"""Module mappings.
"""

def _get_deps(attrs, names):
    return [
        d
        for n in names
        if hasattr(attrs, n)
        for d in getattr(attrs, n)
    ]

# Traverse 'srcs' in addition so that we can go across a genrule
_MODULE_MAPPINGS_DEPS_NAMES = ["deps", "srcs", "_helpers"]

_DEBUG = False

def debug(msg, values = ()):
    if _DEBUG:
        print(msg % values)

def get_module_mappings(label, attrs, srcs = [], workspace_name = None, mappings_attr = "es6_module_mappings"):
    """Returns the module_mappings from the given attrs.

    Collects a {module_name - module_root} hash from all transitive dependencies,
    checking for collisions. If a module has a non-empty `module_root` attribute,
    all sources underneath it are treated as if they were rooted at a folder
    `module_name`.

    Args:
      label: The label declaring a module mapping
      attrs: Attributes on that label
      srcs: The srcs attribute, used to validate that these are under the root
      workspace_name: name of the workspace where the user is building
      mappings_attr: name of the attribute we use to hand down transitive data

    Returns:
      the module_mappings from the given attrs.
    """
    mappings = dict()
    all_deps = _get_deps(attrs, names = _MODULE_MAPPINGS_DEPS_NAMES)
    for dep in all_deps:
        if not hasattr(dep, mappings_attr):
            continue
        for k, v in getattr(dep, mappings_attr).items():
            if k in mappings and mappings[k] != v:
                fail(("duplicate module mapping at %s: %s maps to both %s and %s" %
                      (label, k, mappings[k], v)), "deps")
            mappings[k] = v
    if ((hasattr(attrs, "module_name") and attrs.module_name) or
        (hasattr(attrs, "module_root") and attrs.module_root)):
        mn = attrs.module_name
        if not mn:
            mn = label.name
        mr = "/".join([p for p in [
            workspace_name or label.workspace_root,
            label.package,
        ] if p])
        if attrs.module_root and attrs.module_root != ".":
            mr = "%s/%s" % (mr, attrs.module_root)
            if attrs.module_root.endswith(".ts"):
                if workspace_name:
                    mr = mr.replace(".d.ts", "")

                # Validate that sources are underneath the module root.
                # module_roots ending in .ts are a special case, they are used to
                # restrict what's exported from a build rule, e.g. only exports from a
                # specific index.d.ts file. For those, not every source must be under the
                # given module root.

            else:
                for s in srcs:
                    short_path = s.short_path

                    # Execroot paths for external repositories should start with external/
                    # But the short_path property of file gives the relative path from our workspace
                    # instead. We must correct this to compare with the module_root which is an
                    # execroot path.
                    if short_path.startswith("../"):
                        short_path = "external/" + short_path[3:]
                    if not short_path.startswith(mr):
                        fail(("all sources must be under module root: %s, but found: %s" %
                              (mr, short_path)))
        if mn in mappings and mappings[mn] != mr:
            fail(("duplicate module mapping at %s: %s maps to both %s and %s" %
                  (label, mn, mappings[mn], mr)), "deps")
        mappings[mn] = mr

    debug("Mappings at %s: %s", (label, mappings))
    return mappings

def _module_mappings_aspect_impl(target, ctx):
    mappings = get_module_mappings(target.label, ctx.rule.attr)
    return struct(es6_module_mappings = mappings)

module_mappings_aspect = aspect(
    _module_mappings_aspect_impl,
    attr_aspects = _MODULE_MAPPINGS_DEPS_NAMES,
)

# When building a mapping for use at runtime, we need paths to be relative to
# the runfiles directory. This requires the workspace_name to be prefixed on
# each module root.
def _module_mappings_runtime_aspect_impl(target, ctx):
    if target.label.workspace_root:
        # We need the workspace_name for the target being visited.
        # Skylark doesn't have this - instead they have a workspace_root
        # which looks like "external/repo_name" - so grab the second path segment.
        # TODO(alexeagle): investigate a better way to get the workspace name
        workspace_name = target.label.workspace_root.split("/")[1]
    else:
        workspace_name = ctx.workspace_name
    mappings = get_module_mappings(
        target.label,
        ctx.rule.attr,
        workspace_name = workspace_name,
        mappings_attr = "runfiles_module_mappings",
    )
    return struct(runfiles_module_mappings = mappings)

module_mappings_runtime_aspect = aspect(
    _module_mappings_runtime_aspect_impl,
    attr_aspects = _MODULE_MAPPINGS_DEPS_NAMES,
)

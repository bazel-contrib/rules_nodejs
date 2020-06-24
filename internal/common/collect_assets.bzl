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

"""Helper function and aspect to get module mappings from deps
"""

def _get_deps(attrs, names):
    return [
        d
        for n in names
        if hasattr(attrs, n)
        for d in getattr(attrs, n)
    ]

_COLLECT_ASSETS_NAMES = (
    ["assets"]
)

_DEBUG = False

def _debug(msg, values = ()):
    if _DEBUG:
        print(msg % values)

def collect_assets(label, attrs, srcs = [], workspace_name = None, mappings_attr = "es6_module_mappings"):
    """Returns the module_mappings from the given attrs.

    Collects a {module_name - module_root} hash from all transitive dependencies,
    checking for collisions. If a module has a non-empty `module_root` attribute,
    all sources underneath it are treated as if they were rooted at a folder
    `module_name`.

    Args:
      label: label
      attrs: attributes
      srcs: sources (defaults to [])
      workspace_name: workspace name (defaults to None)
      mappings_attr: mappings attribute to look for (defaults to "es6_module_mappings")

    Returns:
      The module mappings
    """
    mappings = dict()
    all_deps = _get_deps(attrs, names = _COLLECT_ASSETS_NAMES)
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
        mr = label.package
        if workspace_name:
            mr = "%s/%s" % (workspace_name, mr)
        elif label.workspace_root:
            mr = "%s/%s" % (label.workspace_root, mr)
        if attrs.module_root and attrs.module_root != ".":
            if attrs.module_root.endswith(".ts"):
                if workspace_name:
                    # workspace_name is set only when doing module mapping for runtime.
                    # .d.ts module_root means we should be able to load in two ways:
                    #   module_name -> module_path/module_root.js
                    #   module_name/foo -> module_path/foo
                    # So we add two mappings. The one with the trailing slash is longer,
                    # so the loader should prefer it for any deep imports. The mapping
                    # without the trailing slash will be used only when importing from the
                    # bare module_name.
                    mappings[mn + "/"] = mr + "/"
                    mr = "%s/%s" % (mr, attrs.module_root.replace(".d.ts", ".js"))
                else:
                    # This is the type-checking module mapping. Strip the trailing .d.ts
                    # as it doesn't belong in TypeScript's path mapping.
                    mr = "%s/%s" % (mr, attrs.module_root.replace(".d.ts", ""))

                # Validate that sources are underneath the module root.
                # module_roots ending in .ts are a special case, they are used to
                # restrict what's exported from a build rule, e.g. only exports from a
                # specific index.d.ts file. For those, not every source must be under the
                # given module root.

            else:
                mr = "%s/%s" % (mr, attrs.module_root)
                for s in srcs:
                    if not s.short_path.startswith(mr):
                        fail(("all sources must be under module root: %s, but found: %s" %
                              (mr, s.short_path)))
        if mn in mappings and mappings[mn] != mr:
            fail(("duplicate module mapping at %s: %s maps to both %s and %s" %
                  (label, mn, mappings[mn], mr)), "deps")
        mappings[mn] = mr
    _debug("Mappings at %s: %s", (label, mappings))
    return mappings

def _collect_assets_aspect_impl(target, ctx):
    assets = collect_assets(target.label, ctx.rule.attr)
    return struct(assets = mappings)

collect_assets_aspect = aspect(
    _collect_assets_aspect_impl,
    attr_aspects = _COLLECT_ASSETS_NAMES,
)

# When building a mapping for use at runtime, we need paths to be relative to
# the runfiles directory. This requires the workspace_name to be prefixed on
# each module root.
def _collect_assets_aspect_impl(target, ctx):
    if target.label.workspace_root:
        # We need the workspace_name for the target being visited.
        # Skylark doesn't have this - instead they have a workspace_root
        # which looks like "external/repo_name" - so grab the second path segment.
        # TODO(alexeagle): investigate a better way to get the workspace name
        workspace_name = target.label.workspace_root.split("/")[1]
    else:
        workspace_name = ctx.workspace_name
    mappings = collect_assets(
        target.label,
        ctx.rule.attr,
        workspace_name = workspace_name,
        mappings_attr = "runfiles_module_mappings",
    )
    return struct(runfiles_module_mappings = mappings)

collect_assets_aspect = aspect(
    _collect_assets_aspect_impl,
    attr_aspects = _COLLECT_ASSETS_NAMES,
)

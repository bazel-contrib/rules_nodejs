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

"""Helper functions to expand paths into runfiles
"""

# Expand $(location) and $(locations) to runfiles manifest path
def _expand_mlocations(ctx, input, targets):
    paths = ctx.expand_location(input, targets)
    return " ".join([_short_path_to_runfiles_manifest_path(ctx, p, targets) for p in paths.split(" ")])

# Convert a short_path in the execroot to the runfiles manifest path
def _short_path_to_runfiles_manifest_path(ctx, path, targets):
    if path.startswith("../"):
        return path[len("../"):]
    if path.startswith("./"):
        path = path[len("./"):]
    elif path.startswith(ctx.bin_dir.path):
        path = path[len(ctx.bin_dir.path + "/"):]
    elif path.startswith(ctx.genfiles_dir.path):
        path = path[len(ctx.genfiles_dir.path + "/"):]
    return ctx.workspace_name + "/" + path

# Expand $(location) and $(locations) to runfiles short path
def _expand_locations(ctx, input, targets):
    paths = ctx.expand_location(input, targets)
    return " ".join([_short_path_to_runfiles_short_path(ctx, p, targets) for p in paths.split(" ")])

# Convert a short_path in the execroot to the runfiles short path
def _short_path_to_runfiles_short_path(ctx, path, targets):
    path = path.replace(ctx.bin_dir.path + "/external/", "../", 1)
    path = path.replace(ctx.bin_dir.path + "/", "", 1)
    path = path.replace(ctx.genfiles_dir.path + "/external/", "../", 1)
    path = path.replace(ctx.genfiles_dir.path + "/", "", 1)
    return path

def expand_location_into_runfiles(ctx, input, targets = []):
    """Expands all $(location ...) templates in the given string by replacing $(location //x) with the path
    in runfiles of the output file of target //x. Expansion only works for labels that point to direct dependencies
    of this rule or that are explicitly listed in the optional argument targets.

    Path is returned in runfiles manifest path format such as `repo/path/to/file`. This differs from how $(location)
    and $(locations) expansion behaves in expansion the `args` attribute of a *_binary or *_test which returns
    the runfiles short path of the format `./path/to/file` for user repo and `../external_repo/path/to/file` for external
    repositories. We may change this behavior in the future with $(mlocation) and $(mlocations) used to expand
    to the runfiles manifest path.
    See https://docs.bazel.build/versions/master/be/common-definitions.html#common-attributes-binaries.

    Args:
      ctx: context
      input: String to be expanded
      targets: List of targets for additional lookup information.

    Returns:
      The expanded path or the original path
    """
    target = "@%s//%s:%s" % (ctx.workspace_name, "/".join(ctx.build_file_path.split("/")[:-1]), ctx.attr.name)

    # Loop through input an expand all $(location) and $(locations) using _expand_to_mlocation()
    path = ""
    length = len(input)
    last = 0
    for i in range(length):
        if (input[i:i + 12] == "$(mlocation ") or (input[i:i + 13] == "$(mlocations "):
            j = input.find(")", i) + 1
            if (j == 0):
                fail("invalid $(mlocation) expansion in string \"%s\" part of target %s" % (input, target))
            path += input[last:i]
            path += _expand_mlocations(ctx, "$(" + input[i + 3:j], targets)
            last = j
            i = j
        if (input[i:i + 11] == "$(location ") or (input[i:i + 12] == "$(locations "):
            j = input.find(")", i) + 1
            if (j == 0):
                fail("invalid $(location) expansion in string \"%s\" part of target %s" % (input, target))
            path += input[last:i]

            # TODO(gmagolan): flip to _expand_locations in the future so $(location) expands to runfiles short
            # path which is more Bazel idiomatic and $(mlocation) can be used for runfiles manifest path
            path += _expand_mlocations(ctx, input[i:j], targets)
            last = j
            i = j
    path += input[last:]

    return path

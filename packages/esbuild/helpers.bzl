"""
Utility helper functions for the esbuild rule
"""

load("@build_bazel_rules_nodejs//third_party/github.com/bazelbuild/bazel-skylib:lib/paths.bzl", "paths")

TS_EXTENSIONS = ["ts", "tsx"]
JS_EXTENSIONS = ["js", "mjs"]
ALLOWED_EXTENSIONS = JS_EXTENSIONS + TS_EXTENSIONS

def strip_ext(f):
    "Strips the extension of a file."
    return f.short_path[:-len(f.extension) - 1]

def resolve_entry_point(f, inputs, srcs):
    """Find a corresponding javascript entrypoint for a provided file

    Args:
        f: The file where its basename is used to match the entrypoint
        inputs: The list of all inputs
        srcs: List of direct src files to check

    Returns:
        Returns the file that is the corresponding entrypoint
    """

    no_ext = strip_ext(f)

    # check for the ts file in srcs
    for i in srcs:
        if i.extension in TS_EXTENSIONS:
            if strip_ext(i) == no_ext:
                return i

    # check for a js files everywhere else
    for i in inputs:
        if i.extension in JS_EXTENSIONS:
            if strip_ext(i) == no_ext:
                return i

    fail("Could not find corresponding entry point for %s. Add the %s.js to your deps or %s.ts to your srcs" % (f.path, no_ext, no_ext))

def desugar_entry_point_names(entry_point, entry_points):
    """Users can specify entry_point (sugar) or entry_points (long form).

    This function allows our code to treat it like they always used the long form.

    It also validates that exactly one of these attributes should be specified.

    Args:
        entry_point: the simple argument for specifying a single entry
        entry_points: the long form argument for specifing one or more entry points

    Returns:
        the array of entry poitns
    """
    if entry_point and entry_points:
        fail("Cannot specify both entry_point and entry_points")
    if not entry_point and not entry_points:
        fail("One of entry_point or entry_points must be specified")
    if entry_point:
        return [entry_point]
    return entry_points

def filter_files(input, endings = ALLOWED_EXTENSIONS):
    """Filters a list of files for specific endings

    Args:
        input: The depset or list of files
        endings: The list of endings that should be filtered for

    Returns:
        Returns the filtered list of files
    """

    # Convert input into list regardles of being a depset or list
    input_list = input.to_list() if type(input) == "depset" else input
    filtered = []

    for file in input_list:
        for ending in endings:
            if file.path.endswith("." + ending):
                filtered.append(file)
                continue

    return filtered

def generate_path_mapping(package_name, path):
    """Generate a path alias mapping for a jsconfig.json

    For example: {"@my-alias/*": [ "path/to/my-alias/*" ]},

    Args:
        package_name: The module name
        path: The base path of the package
    """

    pkg = {}

    # entry for the barrel files favor mjs over normal as it results
    # in smaller bundles
    pkg[package_name] = [
        path + "/index.mjs",
        path,
    ]

    # A glob import for deep package imports
    pkg[package_name + "/*"] = [path + "/*"]

    return pkg

def write_jsconfig_file(ctx, path_alias_mappings):
    """Writes the js config file for the path alias mappings.

    Args:
        ctx: The rule context
        path_alias_mappings: Dict with the mappings

    Returns:
        File object reference for the jsconfig file
    """

    # The package path, including an "external/repo_name/" prefix if the package is in
    # an external repo.
    rule_path = paths.join(ctx.label.workspace_root, paths.dirname(ctx.build_file_path))

    # Replace all segments in the path with .. join them with "/" and postfix
    # it with another / to get a relative path from the build file dir
    # to the workspace root.
    if len(rule_path) == 0:
        base_url_path = "."
    else:
        base_url_path = "/".join([".." for segment in rule_path.split("/")]) + "/"

    # declare the jsconfig_file
    jsconfig_file = ctx.actions.declare_file("%s.config.json" % ctx.attr.name)

    jsconfig = struct(
        compilerOptions = struct(
            rootDirs = ["."],
            baseUrl = base_url_path,
            paths = path_alias_mappings,
        ),
    )

    # write the config file
    ctx.actions.write(
        output = jsconfig_file,
        content = json.encode(jsconfig),
    )

    return jsconfig_file

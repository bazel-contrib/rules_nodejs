"Utilities functions for selecting and filtering ts and other files"

def _join(*elements):
    segments = [f for f in elements if f]
    if len(segments):
        return "/".join(segments)
    return "."

def _strip_external(path):
    return path[len("external/"):] if path.startswith("external/") else path

def _relative_to_package(path, ctx):
    for prefix in [ctx.bin_dir.path, ctx.label.workspace_name, ctx.label.package]:
        prefix += "/"
        path = _strip_external(path)
        if path.startswith(prefix):
            path = path[len(prefix):]
    return path

def _is_ts_src(src, allow_js):
    if not src.endswith(".d.ts") and (src.endswith(".ts") or src.endswith(".tsx")):
        return True
    return allow_js and (src.endswith(".js") or src.endswith(".jsx"))

def _is_json_src(src, resolve_json_module):
    return resolve_json_module and src.endswith(".json")

def _replace_ext(f, ext_map):
    cur_ext = f[f.rindex("."):]
    new_ext = ext_map.get(cur_ext)
    if new_ext != None:
        return new_ext
    new_ext = ext_map.get("*")
    if new_ext != None:
        return new_ext
    return None

def _out_paths(srcs, out_dir, root_dir, allow_js, ext_map):
    rootdir_replace_pattern = root_dir + "/" if root_dir else ""
    outs = []
    for f in srcs:
        if _is_ts_src(f, allow_js):
            out = _join(out_dir, f[:f.rindex(".")].replace(rootdir_replace_pattern, "") + _replace_ext(f, ext_map))

            # Don't declare outputs that collide with inputs
            # for example, a.js -> a.js
            if out != f:
                outs.append(out)
    return outs

def _calculate_js_outs(srcs, out_dir, root_dir, allow_js, preserve_jsx, emit_declaration_only):
    if emit_declaration_only:
        return []

    exts = {
        "*": ".js",
        ".jsx": ".jsx",
        ".tsx": ".jsx",
    } if preserve_jsx else {"*": ".js"}
    return _out_paths(srcs, out_dir, root_dir, allow_js, exts)

def _calculate_map_outs(srcs, out_dir, root_dir, source_map, preserve_jsx, emit_declaration_only):
    if not source_map or emit_declaration_only:
        return []

    exts = {
        "*": ".js.map",
        ".tsx": ".jsx.map",
    } if preserve_jsx else {"*": ".js.map"}
    return _out_paths(srcs, out_dir, root_dir, False, exts)

def _calculate_typings_outs(srcs, typings_out_dir, root_dir, declaration, composite, allow_js, include_srcs = True):
    if not (declaration or composite):
        return []

    return _out_paths(srcs, typings_out_dir, root_dir, allow_js, {"*": ".d.ts"})

def _calculate_typing_maps_outs(srcs, typings_out_dir, root_dir, declaration_map, allow_js):
    if not declaration_map:
        return []

    exts = {"*": ".d.ts.map"}
    return _out_paths(srcs, typings_out_dir, root_dir, allow_js, exts)

lib = struct(
    join = _join,
    relative_to_package = _relative_to_package,
    is_ts_src = _is_ts_src,
    is_json_src = _is_json_src,
    out_paths = _out_paths,
    calculate_js_outs = _calculate_js_outs,
    calculate_map_outs = _calculate_map_outs,
    calculate_typings_outs = _calculate_typings_outs,
    calculate_typing_maps_outs = _calculate_typing_maps_outs,
)

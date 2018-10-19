def _vs_code_bazel_inspect_impl(target, ctx):
    rule_data = None
    rule_kind = ctx.rule.kind
    trans_descriptor_files = []
    if rule_kind == 'cc_library' or rule_kind == 'cc_binary':
        rule_data = struct(
            includes = target.cc.include_directories
                + target.cc.quote_include_directories
                + target.cc.system_include_directories
        )
        for dep in ctx.rule.attr.deps:
            trans_descriptor_files.append(
                dep[OutputGroupInfo].descriptor_files)
        trans_descriptor_files.append(
            ctx.rule.attr._cc_toolchain[OutputGroupInfo].descriptor_files)

    elif rule_kind == 'cc_toolchain' or rule_kind == 'apple_cc_toolchain':
        rule_data = struct(
            includes = ctx.fragments.cpp.built_in_include_directories
        )
    target_descriptor_file = ctx.actions.declare_file(
        'vs_code_bazel_descriptor_%s.json' % target.label.name)
    data = struct(
        kind = rule_kind,
        data = rule_data
    )
    ctx.actions.write(target_descriptor_file, data.to_json())
    return [OutputGroupInfo(descriptor_files = depset([target_descriptor_file],
        transitive = trans_descriptor_files))]

vs_code_bazel_inspect = aspect(
    implementation = _vs_code_bazel_inspect_impl,
    attr_aspects = ["deps", "_cc_toolchain"],
    fragments = ["cpp"]
)
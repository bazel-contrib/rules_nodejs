"""Test file that sets up an outgoing transition which allows for testing that ensures
transitioned targets are properly packaged into the package output."""

TestTransitionFlagInfo = provider(
    fields = {"enabled": "Whether the transition is enabled."},
)

def _test_transition_flag_impl(ctx):
    return TestTransitionFlagInfo(enabled = ctx.build_setting_value)

test_transition_flag = rule(
    implementation = _test_transition_flag_impl,
    build_setting = config.bool(flag = True),
)

def _test_transition_impl(settings, attr):
    return {"//internal/pkg_npm/test/transition:test_flag": True}

test_transition = transition(
    implementation = _test_transition_impl,
    inputs = [],
    outputs = ["//internal/pkg_npm/test/transition:test_flag"],
)

def _test_rule_impl(ctx):
    file_depsets = []

    for dep in ctx.attr.deps:
        file_depsets.append(dep[DefaultInfo].files)

    return [DefaultInfo(files = depset(transitive = file_depsets))]

test_rule = rule(
    implementation = _test_rule_impl,
    attrs = {
        "deps": attr.label_list(cfg = test_transition),
        # Needed in order to allow for the outgoing transition on the `deps` attribute.
        # https://docs.bazel.build/versions/main/skylark/config.html#user-defined-transitions.
        "_allowlist_function_transition": attr.label(
            default = "@bazel_tools//tools/allowlists/function_transition_allowlist",
        ),
    },
)

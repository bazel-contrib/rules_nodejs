"Illustrate how to wrap pbjs and pbts from protobufjs"

load("@build_bazel_rules_nodejs//:index.bzl", "js_library")
load("@npm//protobufjs-cli:index.bzl", "pbjs", "pbts")
load("@rules_proto//proto:defs.bzl", "ProtoInfo")

def _proto_sources_impl(ctx):
    return DefaultInfo(files = ctx.attr.proto[ProtoInfo].transitive_sources)

_proto_sources = rule(
    doc = """Provider Adapter from ProtoInfo to DefaultInfo.

        Extracts the transitive_sources from the ProtoInfo provided by the proto attr.
        This allows a macro to access the complete set of .proto files needed during compilation.
        """,
    implementation = _proto_sources_impl,
    attrs = {"proto": attr.label(providers = [ProtoInfo])},
)

def _sanitize_label(label_string):
    """Replace characters in a label so it can be used as part of a target name."""
    return label_string.replace(":", "_").replace("/", "_")

def protobufjs_library(name, protos, **kwargs):
    """Minimal wrapper macro around pbjs/pbts tooling

    Args:
        name: name of generated js_library target, also used to name the .js/.d.ts outputs
        protos: labels of proto_library targets to generate for
        **kwargs: passed through to the js_library
    """

    js_out = name + "_pb.js"
    ts_out = js_out.replace(".js", ".d.ts")

    js_target = "_%s_pbjs" % name
    ts_target = "_%s_pbts" % name

    # Generate some target names, based on the provided name
    # (so that they are unique if the macro is called several times in one package)
    proto_targets = ["_%s_%s" % (name, _sanitize_label(proto)) for proto in protos]

    # grab the transitive .proto files needed to compile the given one
    for proto, proto_target in zip(protos, proto_targets):
        _proto_sources(
            name = proto_target,
            proto = proto,
        )

    # Transform .proto files to a single _pb.js file named after the macro
    pbjs(
        name = js_target,
        data = proto_targets,
        # Arguments documented at
        # https://github.com/protobufjs/protobuf.js/tree/6.8.8#pbjs-for-javascript
        args = [
            "--target=static-module",
            "--wrap=default",
            "--strict-long",  # Force usage of Long type with int64 fields
            "--out=$@",
            " ".join(["$(execpaths %s)" % proto_target for proto_target in proto_targets]),
        ],
        outs = [js_out],
    )

    # Transform the _pb.js file to a .d.ts file with TypeScript types
    pbts(
        name = ts_target,
        data = [js_target],
        # Arguments documented at
        # https://github.com/protobufjs/protobuf.js/tree/6.8.8#pbts-for-typescript
        args = [
            "--out=$@",
            "$(execpath %s)" % js_target,
        ],
        outs = [ts_out],
    )

    # Expose the results as js_library which provides DeclarationInfo for interop with other rules
    js_library(
        name = name,
        srcs = [
            js_target,
            ts_target,
        ],
        **kwargs
    )

"Public API for rules"

load("//nodejs/private:ts_declaration.bzl", lib = "ts_declaration")

ts_declaration = rule(
    doc = """Adapter from .d.ts sources to a DeclarationInfo.
    
    This rule has no actions, so it's similar to a fileset.
    It allows you to feed typings into rules which require DeclarationInfo,
    for example as to `ts_project#deps`.
    """,
    implementation = lib.implementation,
    attrs = lib.attrs,
    provides = lib.provides,
)

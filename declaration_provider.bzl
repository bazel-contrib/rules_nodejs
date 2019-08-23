"""This module contains a provider for TypeScript typings files (.d.ts)"""

def provide_declarations(**kwargs):
    """Factory function for creating checked declarations with externs.

    Do not directly construct DeclarationInfo()
    """

    # TODO: add some checking actions to ensure the declarations are well-formed
    return DeclarationInfo(**kwargs)

DeclarationInfo = provider(
    doc = """The DeclarationInfo provider allows JS rules to communicate typing information.
TypeScript's .d.ts files are used as the interop format for describing types.

Do not create DeclarationInfo instances directly, instead use the provide_declarations factory function.

TODO(alexeagle): The ts_library#deps attribute should require that this provider is attached.

Note: historically this was a subset of the string-typed "typescript" provider.
""",
    # TODO: if we ever enable --declarationMap we will have .d.ts.map files too
    fields = {
        "declarations": "A depset of .d.ts files produced by this rule",
        "transitive_declarations": """A depset of .d.ts files produced by this rule and all its transitive dependencies.
This prevents needing an aspect in rules that consume the typings, which improves performance.""",
    },
)

"""Providers for interop between JS rules.

This file has to live in the built-in so that all rules can load() the providers
even if users haven't installed any of the packages/*

These providers allows rules to interoperate without knowledge
of each other.

You can think of a provider as a message bus.
A rule "publishes" a message as an instance of the provider, and some other rule
subscribes to these by having a (possibly transitive) dependency on the publisher.

## Debugging

Debug output is considered orthogonal to these providers.
Any output may or may not have user debugging affordances provided, such as
readable minification.
We expect that rules will have a boolean `debug` attribute, and/or accept the `DEBUG`
environment variable.
Note that this means a given build either produces debug or non-debug output.
If users really need to produce both in a single build, they'll need two rules with
differing 'debug' attributes.
"""

JSEcmaScriptModuleInfo = provider(
    doc = """JavaScript files (and sourcemaps) that are intended to be consumed by downstream tooling.

They should use modern syntax and ESModules.
These files should typically be named "foo.mjs"
TODO: should we require that?

Historical note: this was the typescript.es6_sources output""",
    fields = {
        "sources": "depset of direct and transitive JavaScript files and sourcemaps",
    },
)

def transitive_js_ecma_script_module_info(sources, deps = []):
    """Constructs a JSEcmaScriptModuleInfo including all transitive sources from JSEcmaScriptModuleInfo providers in a list of deps.

Returns a single JSEcmaScriptModuleInfo.
"""
    return combine_js_ecma_script_module_info([JSEcmaScriptModuleInfo(sources = sources)] + collect_js_ecma_script_module_infos(deps))

def combine_js_ecma_script_module_info(modules):
    """Combines all JavaScript sources and sourcemaps from a list of JSEcmaScriptModuleInfo providers.

Returns a single JSEcmaScriptModuleInfo.
"""
    sources_depsets = []
    for module in modules:
        sources_depsets.extend([module.sources])
    return JSEcmaScriptModuleInfo(
        sources = depset(transitive = sources_depsets),
    )

def collect_js_ecma_script_module_infos(deps):
    """Collects all JSEcmaScriptModuleInfo providers from a list of deps.

Returns a list of JSEcmaScriptModuleInfo providers.
"""
    modules = []
    for dep in deps:
        if JSEcmaScriptModuleInfo in dep:
            modules.extend([dep[JSEcmaScriptModuleInfo]])
    return modules

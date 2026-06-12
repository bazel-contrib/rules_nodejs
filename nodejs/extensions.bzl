"""Module extensions for nodejs toolchain registration in MODULE.bazel

Example usage, assuming a `.nvmrc` file is present in the same directory as the `MODULE.bazel` file:

```starlark
node = use_extension("@rules_nodejs//nodejs:extensions.bzl", "node")
node.toolchain(node_version_from_nvmrc = "//:.nvmrc")
use_repo(node, "nodejs_toolchains")
```
"""

load("//nodejs/private:fetch_node_repositories.bzl", "fetch_node_repositories")
load("//nodejs/private:nodejs_toolchains_repo.bzl", "PLATFORMS")
load("//nodejs/private:version_from_attr.bzl", "version_from_attr")
load(
    ":repositories.bzl",
    "DEFAULT_NODE_REPOSITORY",
    "DEFAULT_NODE_URL",
    "DEFAULT_NODE_VERSION",
    "nodejs_register_toolchains",
)

def _toolchain_repr(toolchain):
    """ Return a `toolchain` tag object representation useful for diagnostics """
    key_values = [(attr, getattr(toolchain, attr)) for attr in _ATTRS]
    return ", ".join(["%s = %r" % (attr, value) for attr, value in key_values if value])

def _toolchains_equal(lhs, rhs):
    """ Compare two `toolchain` tag objects """
    for attr in _ATTRS:
        if getattr(lhs, attr) != getattr(rhs, attr):
            return False
    return True

def _use_repository_facts(registration):
    """Whether we should use facts (if available) for the given registration."""

    if registration.node_repositories.items():
        return False  # custom repositories, do not mess with them.
    if registration.node_urls != [DEFAULT_NODE_URL]:
        return False  # we do not know how to fetch shas with custom URLs.

    return True

def _update_repository_facts(module_ctx, registrations):
    """Fetch / update the necessary repository facts for the given registrations.

    * Takes into account existing facts.
    * Returns empty dict if facts are not supported.
    """

    if not hasattr(module_ctx, "facts"):
        # facts not supported.
        # repository rules will fallback to builtin NODE_VERSIONS.
        return {}

    new_facts = {}

    for registration in registrations.values():
        if not _use_repository_facts(registration):
            continue

        version = version_from_attr(module_ctx, registration)

        should_fetch = False

        # Get repository values for the default PLATFORMS.
        # These are the only platforms supported by the extension anyways.
        for platform in PLATFORMS:
            key = version + "-" + platform

            existing = new_facts.get(key) or module_ctx.facts.get(key)
            if existing:
                new_facts[key] = existing
            else:
                should_fetch = True

        if should_fetch:
            # Note: Even after fetching, it is possible that keys are not in facts:
            # Old node versions might not have all platforms.
            # In that case, we want to fail lazily when the repository is actually used.
            new_facts.update(fetch_node_repositories(module_ctx, version))

    return new_facts

def _toolchain_extension(module_ctx):
    registrations = {}
    for mod in module_ctx.modules:
        for toolchain in mod.tags.toolchain:
            if toolchain.name != DEFAULT_NODE_REPOSITORY and not mod.is_root:
                fail("Only the root module may provide a name for the node toolchain.")

            if toolchain.name in registrations.keys():
                if toolchain.name == DEFAULT_NODE_REPOSITORY:
                    # Prioritize the root-most registration of the default node toolchain version and
                    # ignore any further registrations (modules are processed breadth-first)
                    continue
                if not _toolchains_equal(toolchain, registrations[toolchain.name]):
                    fail("Multiple conflicting toolchains declared:\n* {}\n* {}".format(
                        _toolchain_repr(toolchain),
                        _toolchain_repr(registrations[toolchain.name]),
                    ))
                else:
                    # No problem to register a matching toolchain twice
                    continue
            else:
                registrations[toolchain.name] = toolchain

    repository_facts = _update_repository_facts(module_ctx, registrations)

    for k, v in registrations.items():
        nodejs_register_toolchains(
            name = k,
            node_version = v.node_version,
            node_version_from_nvmrc = v.node_version_from_nvmrc,
            node_urls = v.node_urls,
            node_repositories = (
                repository_facts if _use_repository_facts(v) else v.node_repositories
            ),
            include_headers = v.include_headers,
            register = False,
        )

    if hasattr(module_ctx, "facts"):
        return module_ctx.extension_metadata(
            reproducible = True,
            facts = repository_facts,
        )
    else:
        return  # buildifier: disable=return-value (allow no value)

_ATTRS = {
    "name": attr.string(
        doc = "Base name for generated repositories",
        default = DEFAULT_NODE_REPOSITORY,
    ),
    "node_version": attr.string(
        doc = "Version of the Node.js interpreter",
        default = DEFAULT_NODE_VERSION,
    ),
    "node_version_from_nvmrc": attr.label(
        allow_single_file = True,
        doc = """The .nvmrc file containing the version of Node.js to use.

This is recommended to ensure Bazel uses the same Node.js version as non-Bazel tooling.
If set then the version found in the .nvmrc file is used instead of the one specified by node_version.""",
    ),
    "include_headers": attr.bool(
        doc = """Set headers field in NodeInfo provided by this toolchain.

Required to compile native code into a Node.js binary.
This setting creates a dependency on a c++ toolchain.
""",
    ),
    "node_urls": attr.string_list(
        doc = """List of URLs to use to download Node.js.

 Each entry is a template for downloading a node distribution.

 The `{version}` parameter is substituted with the `node_version` attribute,
 and `{filename}` with the matching entry from the `node_repositories` attribute.
 """,
        default = [DEFAULT_NODE_URL],
    ),
    "node_repositories": attr.string_list_dict(
        doc = """Custom list of node repositories to use

A dictionary mapping Node.js versions to sets of hosts and their corresponding (filename, strip_prefix, sha256) tuples.
You should list a node binary for every platform users have, likely Mac, Windows, and Linux.

By default, if this attribute has no items, we'll use a list of all public Node.js releases.
""",
    ),
}

node = module_extension(
    implementation = _toolchain_extension,
    tag_classes = {
        "toolchain": tag_class(attrs = _ATTRS),
    },
)

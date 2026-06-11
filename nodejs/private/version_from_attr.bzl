"""Helper to get node version from user config."""

def _verify_version_is_valid(version):
    major, minor, patch = (version.split(".") + [None, None, None])[:3]
    if not major.isdigit() or not minor.isdigit() or not patch.isdigit():
        fail("Invalid node version: %s" % version)

def version_from_attr(ctx, attr):
    """Extract the node version from attr.

    Verifies if the extracted version is valid.

    Args:
      ctx: repository or module context
      attr: A struct with fields node_version and node_version_from_nvmrc

    Returns: node version.
    """

    node_version = attr.node_version

    if attr.node_version_from_nvmrc:
        node_version = str(ctx.read(attr.node_version_from_nvmrc)).strip()

    _verify_version_is_valid(node_version)

    return node_version

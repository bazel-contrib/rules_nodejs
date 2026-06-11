"""Implementation of node SHASUM fetching for facts."""

_REPOSITORY_TYPES = {
    "darwin-arm64.tar.gz": "darwin_arm64",
    "darwin-x64.tar.gz": "darwin_amd64",
    "linux-x64.tar.xz": "linux_amd64",
    "linux-arm64.tar.xz": "linux_arm64",
    "linux-s390x.tar.xz": "linux_s390x",
    "win-x64.zip": "windows_amd64",
    "win-arm64.zip": "windows_arm64",
    "linux-ppc64le.tar.xz": "linux_ppc64le",
}

def fetch_node_repositories(module_ctx, version):
    """Fetches node repositories for the given node version.

    Port of scripts/update-nodejs-versions.js
    """

    shasums_filename = "{version}-SHASUMS256.txt".format(version = version)
    url = "https://nodejs.org/dist/v{version}/SHASUMS256.txt".format(version = version)

    result = module_ctx.download(url = url, output = shasums_filename)
    if not result.success:
        fail("Failed to fetch node shasums:", url, result, sep = "\n")

    shasums = module_ctx.read(shasums_filename)

    result = {}

    for line in shasums.splitlines():
        line = line.strip()
        if not line:
            continue

        parts = line.split("  ")
        if len(parts) != 2:
            fail("{url} contains unexpected line:\n{line}".format(
                url = url,
                line = line,
            ))

        sha, filename = parts
        type = _REPOSITORY_TYPES.get(filename.removeprefix("node-v%s-" % version))
        if not type:
            continue

        strip_prefix = filename.removesuffix(".tar.gz").removesuffix(".tar.xz").removesuffix(".zip")
        result[version + "-" + type] = (filename, strip_prefix, sha)

    return result

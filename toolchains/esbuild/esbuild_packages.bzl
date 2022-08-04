"""Info for the esbuild packages used"""

### These values are updated automaticly via `yarn update-esbuild-versions`
_VERSION = "0.14.53"
_DARWIN_AMD64_SHA = "8f3b4c241e9f0454841dbc552b8c7cc9da31efa119726b7cfc5578af64511f22"
_DARWIN_ARM64_SHA = "a781e2abd7c8acb19f06533f24b19c3412954529e10b300c7ad0e66d4b2467be"
_LINUX_AMD64_SHA = "3268b0e9e5a15d07a00b88a80b4b34355550b1c28396b7891ee3bebceb42cbc9"
_LINUX_ARM64_SHA = "181fce9835d7dd4d1e44778b84fa790c2b915cd6a66b98d5d9361be76af6d379"
_WINDOWS_AMD64_SHA = "ec68d8350e6e7e058944ab52361aa3316eaf4d01d432b3a8fa6d1665d1e1e78f"

ESBUILD_PACKAGES = struct(
    version = _VERSION,
    platforms = dict({
        "darwin_amd64": struct(
            sha = _DARWIN_AMD64_SHA,
            urls = [
                "https://registry.npmjs.org/esbuild-darwin-64/-/esbuild-darwin-64-%s.tgz" % _VERSION,
            ],
            binary_path = "bin/esbuild",
            exec_compatible_with = [
                "@platforms//os:macos",
                "@platforms//cpu:x86_64",
            ],
        ),
        "darwin_arm64": struct(
            sha = _DARWIN_ARM64_SHA,
            urls = [
                "https://registry.npmjs.org/esbuild-darwin-arm64/-/esbuild-darwin-arm64-%s.tgz" % _VERSION,
            ],
            binary_path = "bin/esbuild",
            exec_compatible_with = [
                "@platforms//os:macos",
                "@platforms//cpu:aarch64",
            ],
        ),
        "linux_amd64": struct(
            sha = _LINUX_AMD64_SHA,
            urls = [
                "https://registry.npmjs.org/esbuild-linux-64/-/esbuild-linux-64-%s.tgz" % _VERSION,
            ],
            binary_path = "bin/esbuild",
            exec_compatible_with = [
                "@platforms//os:linux",
                "@platforms//cpu:x86_64",
            ],
        ),
        "linux_arm64": struct(
            sha = _LINUX_ARM64_SHA,
            urls = [
                "https://registry.npmjs.org/esbuild-linux-arm64/-/esbuild-linux-arm64-%s.tgz" % _VERSION,
            ],
            binary_path = "bin/esbuild",
            exec_compatible_with = [
                "@platforms//os:linux",
                "@platforms//cpu:aarch64",
            ],
        ),
        "windows_amd64": struct(
            sha = _WINDOWS_AMD64_SHA,
            urls = [
                "https://registry.npmjs.org/esbuild-windows-64/-/esbuild-windows-64-%s.tgz" % _VERSION,
            ],
            binary_path = "esbuild.exe",
            exec_compatible_with = [
                "@platforms//os:windows",
                "@platforms//cpu:x86_64",
            ],
        ),
    }),
)

"""Info for the esbuild packages used"""

### These values are updated automaticly via `yarn update-esbuild-versions`
_VERSION = "0.14.42"
_DARWIN_AMD64_SHA = "64dc26160664b7ab6604b1176a1f469c2400f14bb9f63685d4aba435603a1241"
_DARWIN_ARM64_SHA = "f9e1b21af11b106d026bf8537d60232f23ec3fc8f1407f2890c7ebb9fd4c9c96"
_LINUX_AMD64_SHA = "61b987f8703500e7e932cdee6488c7abd79dba6507570ac67029cc311eafba36"
_LINUX_ARM64_SHA = "382bc7c0f837818ebea178e3fa0a415684a9a9d459b3c59380d68d1de7ce51c3"
_WINDOWS_AMD64_SHA = "fba91b88b0f646c9b6a8c1f405bf436a7e4b1fb24ad3df84b530f60bbd76ec57"

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

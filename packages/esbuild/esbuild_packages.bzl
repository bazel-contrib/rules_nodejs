"""Info for the esbuild packages used"""

### These values are updated automaticly via `yarn update-esbuild-versions`
_VERSION = "0.12.5"
_DARWIN_AMD64_SHA = "6037c279c2bd09ae6ff490f18ea95ab514db044df63db47268411dfc48a49b16"
_DARWIN_ARM64_SHA = "bb950e084302652a11c5d38aeae773fa6f46b864e7b89264c9354222aa8d326d"
_LINUX_AMD64_SHA = "ea9bae194f4d18297ccb00139c62326e3da40835bbadbe21848c3e2cded35a3a"
_LINUX_ARM64_SHA = "f70fbe27a5dab5dd6f19f76f60660ad59b8a6883652bb1fd878078cf922915ad"
_WINDOWS_AMD64_SHA = "ce16dc8d565f8b30b538496961ba17c1977ddd400d0f20b7e89482ecd0944d5d"

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

"""Info for the esbuild packages used"""

### These values are updated automaticly via `yarn update-esbuild-versions`
_VERSION = "0.14.31"
_DARWIN_AMD64_SHA = "31313010e785618d3f2d7cfb7acc36d0eacc9e15a007f7640325d876c9336f80"
_DARWIN_ARM64_SHA = "08f5b1a5ccac2e8feb4020cbecbf12f9da377476d63899320e31a58cea2abf33"
_LINUX_AMD64_SHA = "152e07d72d723cb0281045a7ef0fb745cc29aa4f11bfadf37c8f37d7c782fe68"
_LINUX_ARM64_SHA = "6f9e06951d947e8b98a71d409310dbe96b7d87d0b0fe40ab55fd192319d5d58f"
_WINDOWS_AMD64_SHA = "601103c4ce6518226887d50f517e8d6f683bdb15256dec6658278094f21b584d"

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

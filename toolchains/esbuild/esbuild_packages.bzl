"""Info for the esbuild packages used"""

### These values are updated automaticly via `yarn update-esbuild-versions`
_VERSION = "0.15.12"
_DARWIN_AMD64_SHA = "4183b6fbfe5af6f9259171847ed66342d262c5082cb6af2db9af2d8909631527"
_DARWIN_ARM64_SHA = "7bbeedc0e5916811ac63ede102e61b8479b454344fc99bee471d7b302cdd81fd"
_LINUX_AMD64_SHA = "daeed357eec71bc707f9f375fa136c1f91d371bfdff04ea06fe779b960fccbb6"
_LINUX_ARM64_SHA = "32004f9f008dbd099dfaf51eb861f9e0b1e9c4ca422d4466d1ca6e92b66c1cfd"
_WINDOWS_AMD64_SHA = "9f270d393a6b9aab79fb1b64d74251c60ba76d08c013c8297100e98fae600c94"
_LINUX_PPC64LE_SHA = "8593b944bb00a5f86d1eb0349df2ee48a47996880288f263c8547b6611d0e7a1"
_LINUX_S390X_SHA = "0787bb6426d1f6a458701e2965b26371f99b4a4b27a7de1c3add573f46abc1f9"

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
                "@platforms//cpu:arm64",
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
                "@platforms//cpu:arm64",
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
        "linux_ppc64le": struct(
            sha = _LINUX_PPC64LE_SHA,
            urls = [
                "https://registry.npmjs.org/esbuild-linux-ppc64le/-/esbuild-linux-ppc64le-%s.tgz" % _VERSION,
            ],
            binary_path = "bin/esbuild",
            exec_compatible_with = [
                "@platforms//os:linux",
                "@platforms//cpu:ppc",
            ],
        ),
        "linux_s390x": struct(
            sha = _LINUX_S390X_SHA,
            urls = [
                "https://registry.npmjs.org/esbuild-linux-s390x/-/esbuild-linux-s390x-%s.tgz" % _VERSION,
            ],
            binary_path = "bin/esbuild",
            exec_compatible_with = [
                "@platforms//os:linux",
                "@platforms//cpu:s390x",
            ],
        ),
    }),
)

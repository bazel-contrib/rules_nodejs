"""Info for the esbuild packages used"""

### These values are updated automaticly via `yarn update-esbuild-versions`
_VERSION = "0.15.14"
_DARWIN_AMD64_SHA = "43e39b10a8c58d60c7a3e8f687829e289e34ead7f27bdec1092281a6e984ce92"
_DARWIN_ARM64_SHA = "7933d44a493f1ddf0982d0150f71c748c3aac84c96283074385dda706f8ec531"
_LINUX_AMD64_SHA = "c445d0d59e3b92a4e381f98fb2ac0cd587e24d295234b45f16be324040e6a3e6"
_LINUX_ARM64_SHA = "ab9e763586af8a861eef4ea30305e176aa7466a21aff6138d39224601c1e0835"
_WINDOWS_AMD64_SHA = "812a56c5456cebeaea8f9b0914c54ba1ce8128fc3eb20cee3209101002e58c81"
_LINUX_PPC64LE_SHA = "94455a2084d3585980d83426ce9e90e5b550c64cb1a558a25e1d3d5a380fb8da"
_LINUX_S390X_SHA = "9328d7f287b4c1d76576f8e89061de3e5613f6b86be6e8e4b0f984396b2ea0e3"

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

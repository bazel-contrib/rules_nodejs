"""Info for the esbuild packages used"""

### These values are updated automaticly via `yarn update-esbuild-versions`
_VERSION = "0.15.15"
_DARWIN_AMD64_SHA = "bf96240b8c4cc9d38c937bd7f9b322df5ca64e3468d2403b63462e6872964c93"
_DARWIN_ARM64_SHA = "6586fb88ca456289f0965d89474cf568f45b847aee14356aee4d37c3e7eb7a30"
_LINUX_AMD64_SHA = "f4294a0e3fe2649e1a473c75595b1224506376383499000487d8ab3b50daa3ee"
_LINUX_ARM64_SHA = "2fecbc24a57ba1e018d41003f0c7cd4af4a3720a04f59591d69e815a88e07f58"
_WINDOWS_AMD64_SHA = "199e857a5e3b9579388ebed8c9f373c60e47c5c503845f3cbd2a6495e27600a5"
_LINUX_PPC64LE_SHA = "ec601d4f7f56f6cc64e6500a296b0dc34239a1d90cde5cf1684e08967c0fecfc"
_LINUX_S390X_SHA = "d9e609cd0f272738e5133a4a90fdf6734b00bf17e30bf4cc193f5184e1e76e93"

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

"""Info for the esbuild packages used"""

### These values are updated automaticly via `yarn update-esbuild-versions`
_VERSION = "0.15.16"
_DARWIN_AMD64_SHA = "3a49ad0950386e0ec0a36da5b8fc88f035d11050f655955c8292a7910c14379a"
_DARWIN_ARM64_SHA = "cde26bd8465d0cd277a1cfcb08972ad0c86db7f989fc27a4e6cc6fa1a3fafb79"
_LINUX_AMD64_SHA = "f3a17b05ebaac0654265d43ff14d86265b79e82981abcc1c2bf952b7288081d1"
_LINUX_ARM64_SHA = "79db53b0f21eafca2fd4a397c271498904e1dee0dfcc607097d878b463e2a547"
_WINDOWS_AMD64_SHA = "d9b27c38561dbea5be060b482678c463a0b70d8224002193096c2e8633a092bd"
_LINUX_PPC64LE_SHA = "2602c5a31470eef77f7ef6a2f0afb67571325fac986df52ddc0d9ad2672a507a"
_LINUX_S390X_SHA = "ba4a33c8152cc7ad9a1ced1afc335d6abb325223c42c9cbf327615f90acec098"

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

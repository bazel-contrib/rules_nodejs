"""Info for the esbuild packages used"""

### These values are updated automaticly via `yarn update-esbuild-versions`
_VERSION = "0.16.4"
_DARWIN_AMD64_SHA = "c8d3eae160a892e32837db3dcae515e843e5383fef52b8141940c8bcf8b6d59f"
_DARWIN_ARM64_SHA = "c8d3eae160a892e32837db3dcae515e843e5383fef52b8141940c8bcf8b6d59f"
_LINUX_AMD64_SHA = "c8d3eae160a892e32837db3dcae515e843e5383fef52b8141940c8bcf8b6d59f"
_LINUX_ARM64_SHA = "c8d3eae160a892e32837db3dcae515e843e5383fef52b8141940c8bcf8b6d59f"
_WINDOWS_AMD64_SHA = "c8d3eae160a892e32837db3dcae515e843e5383fef52b8141940c8bcf8b6d59f"
_LINUX_PPC64LE_SHA = "c8d3eae160a892e32837db3dcae515e843e5383fef52b8141940c8bcf8b6d59f"
_LINUX_S390X_SHA = "c8d3eae160a892e32837db3dcae515e843e5383fef52b8141940c8bcf8b6d59f"

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

"""Info for the esbuild packages used"""

### These values are updated automatically via `yarn update-esbuild-versions`
_VERSION = "0.13.8"
_DARWIN_AMD64_SHA = "e912583b1c6931ef6f98476425958090fe49027f025316353dd1dc6f5fb24937"
_DARWIN_ARM64_SHA = "4c456633978238d0e8652e79b1fe665bf7795d7034cc85191c9d126ac9bca4f4"
_LINUX_AMD64_SHA = "44640fb6ebe36adb76b9409ccf1f5cc464864a674368d0f3ffbd0a74e3c3dd80"
_LINUX_ARM64_SHA = "4a7dc020a0e449a9138a0238fee52d76d9018df9c78c9fee7550e7545225b628"
_WINDOWS_AMD64_SHA = "6120b8299c50c37c1887b50ad58d44cf9788dc4d3fcbd1ed51566cce6aecf59a"
_FREEBSD_AMD64_SHA = "091180e1bc405789b0280d3426bfff92eec2a7e9a86096ffca93a2abe6e7f364"
_FREEBSD_ARM64_SHA = "7f3823df4feea92d79491109edd10c151eda9151494ac55308bde41f2407d7e9"

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
        "freebsd_amd64": struct(
            sha = _FREEBSD_AMD64_SHA,
            urls = [
                "https://registry.npmjs.org/esbuild-freebsd-64/-/esbuild-freebsd-64-%s.tgz" % _VERSION,
            ],
            binary_path = "bin/esbuild",
            exec_compatible_with = [
                "@platforms//os:freebsd",
                "@platforms//cpu:x86_64",
            ],
        ),
        "freebsd_arm64": struct(
            sha = _FREEBSD_ARM64_SHA,
            urls = [
                "https://registry.npmjs.org/esbuild-freebsd-arm64/-/esbuild-freebsd-arm64-%s.tgz" % _VERSION,
            ],
            binary_path = "bin/esbuild",
            exec_compatible_with = [
                "@platforms//os:freebsd",
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

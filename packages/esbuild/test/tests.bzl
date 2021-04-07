"""Default esbuild binary selection for tests"""

load("//packages/esbuild:index.bzl", _esbuild = "esbuild")

esbuild = _esbuild

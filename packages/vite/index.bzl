"""
vite public rules
"""

load(
    "@build_bazel_rules_nodejs//packages/vite/internal:rules.bzl",
    _vite = "vite_build",
    _vite_dev = "vite_devserver_macro",
)

vite = _vite
vite_dev = _vite_dev

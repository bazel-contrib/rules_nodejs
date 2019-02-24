# Public API surface re-exports
# Users shouldn't import under src/

load("//webpack/src:webpack_bundle.bzl", _webpack_bundle = "webpack_bundle")

webpack_bundle = _webpack_bundle

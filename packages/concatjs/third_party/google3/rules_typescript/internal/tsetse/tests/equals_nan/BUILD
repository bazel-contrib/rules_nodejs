licenses(["notice"])  # Apache 2.0

load("//:defs.bzl", "ts_library")

error_message = "TS21223: x == NaN and x === NaN are always false; use isNaN\(x\) instead"

ts_library(
    name = "positives",
    testonly = 1,
    srcs = [
        "positives.ts",
    ],
    expected_diagnostics = [
        "\(2,19\).*" + error_message,
        "\(6,5\).*" + error_message,
        "\(7,5\).*" + error_message,
        "\(9,1\).*" + error_message,
        "\(10,1\).*" + error_message,
    ],
)

ts_library(
    name = "negatives",
    testonly = 1,
    srcs = [
        "negatives.ts",
    ],
)

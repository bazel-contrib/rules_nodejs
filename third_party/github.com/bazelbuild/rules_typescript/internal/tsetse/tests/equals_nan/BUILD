licenses(["notice"])  # Apache 2.0

load("//:defs.bzl", "ts_library")

ts_library(
    name = "positives",
    testonly = 1,
    srcs = [
        "positives.ts",
    ],
    expected_diagnostics = [
        "\(2,19\): error TS21223: x === NaN is always false; use isNaN\(x\) instead",
        "\(6,5\): error TS21223: x === NaN is always false; use isNaN\(x\) instead",
        "\(7,5\): error TS21223: x == NaN is always false; use isNaN\(x\) instead",
        "\(8,5\): error TS21223: x !== NaN is always true; use !isNaN\(x\) instead",
        "\(9,5\): error TS21223: x != NaN is always true; use !isNaN\(x\) instead",
        "\(11,1\): error TS21223: x === NaN is always false; use isNaN\(x\) instead",
        "\(12,1\): error TS21223: x === NaN is always false; use isNaN\(x\) instead",
    ],
)

ts_library(
    name = "negatives",
    testonly = 1,
    srcs = [
        "negatives.ts",
    ],
)

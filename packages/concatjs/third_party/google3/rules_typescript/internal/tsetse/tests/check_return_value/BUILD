licenses(["notice"])  # Apache 2.0

load("//:defs.bzl", "ts_library")

error_message = "TS21222: return value is unused.\\n\\tSee http://tsetse.info/check-return-value"

ts_library(
    name = "no_expected_diagnostics_test",
    testonly = 1,
    srcs = ["no_expected_diagnostics.ts"],
    tsconfig = "//internal/tsetse:tsconfig.json",
)

ts_library(
    name = "expected_diagnostics_test",
    testonly = 1,
    srcs = ["expected_diagnostics.ts"],
    expected_diagnostics = [
        "\(6,1\).*" + error_message,
        "\(8,1\).*" + error_message,
        "\(12,1\).*" + error_message,
        "\(16,1\).*" + error_message,
        "\(19,1\).*" + error_message,
    ],
    tsconfig = "//internal/tsetse:tsconfig.json",
)

ts_library(
    name = "user_defined_check_return_value",
    testonly = 1,
    srcs = ["user_defined_check_return_value.ts"],
    tsconfig = "//internal/tsetse:tsconfig.json",
)

ts_library(
    name = "unused_return_value_user_defined_function",
    testonly = 1,
    srcs = ["unused_return_value_user_defined_function.ts"],
    expected_diagnostics = [
        "\(3,1\).*" + error_message,
        "\(4,1\).*" + error_message,
        "\(6,1\).*" + error_message,
        "\(8,1\).*" + error_message,
        "\(14,1\).*" + error_message,
    ],
    tsconfig = "//internal/tsetse:tsconfig.json",
    deps = [":user_defined_check_return_value"],
)

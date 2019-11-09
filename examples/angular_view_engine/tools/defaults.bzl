"Set some defaults for karma rules"

load("@npm_bazel_karma//:index.bzl", _karma_web_test_suite = "karma_web_test_suite")

def karma_web_test_suite(name, browsers = [], tags = [], **kwargs):
    _karma_web_test_suite(
        name = name,
        tags = tags + ["native", "no-bazelci"],
        browsers = browsers,
        **kwargs
    )

    # BazelCI docker images are missing shares libs to run a subset browser tests:
    # mac: firefox does not work, chrome works
    # ubuntu: firefox and chrome do not work --- there are 0 tests to run
    _karma_web_test_suite(
        name = "bazelci_" + name,
        tags = tags + ["native", "no-circleci"],
        browsers = [
            "@io_bazel_rules_webtesting//browsers:chromium-local",
        ],
        **kwargs
    )

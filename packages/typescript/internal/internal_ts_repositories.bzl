load("@bazel_gazelle//:deps.bzl", "go_repository")

def ts_setup_dev_workspace():
    """
    Setup the toolchain needed for local development, but not needed by users.

    These needs to be in a separate file from ts_setup_workspace() so as not
    to leak load statements.
    """

    ts_setup_workspace()

    go_repository(
        name = "com_github_kylelemons_godebug",
        commit = "d65d576e9348f5982d7f6d83682b694e731a45c6",
        importpath = "github.com/kylelemons/godebug",
    )

    go_repository(
        name = "com_github_mattn_go_isatty",
        commit = "c2a7a6ca930a4cd0bc33a3f298eb71960732a3a7",  # v0.0.7
        importpath = "github.com/mattn/go-isatty",
    )

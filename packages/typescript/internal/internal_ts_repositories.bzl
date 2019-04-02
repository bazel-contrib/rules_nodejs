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
        commit = "3fb116b820352b7f0c281308a4d6250c22d94e27",
        importpath = "github.com/mattn/go-isatty",
    )

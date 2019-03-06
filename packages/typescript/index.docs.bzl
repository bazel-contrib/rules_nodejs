# This contains references to the symbols we want documented.
# We can't point stardoc to the top-level index.bzl since then it will see macros rather than the rules they wrap.
# So this is a copy of index.bzl with macro indirection removed.

load("//:version.bzl", _check_rules_typescript_version = "check_rules_typescript_version")
load("//internal/devserver:ts_devserver.bzl", _ts_devserver = "ts_devserver")
load("//internal/protobufjs:ts_proto_library.bzl", _ts_proto_library = "ts_proto_library")
load("//internal:build_defs.bzl", _ts_library = "ts_library")
load("//internal:ts_config.bzl", _ts_config = "ts_config")
load("//internal:ts_repositories.bzl", _ts_setup_workspace = "ts_setup_workspace")

check_rules_typescript_version = _check_rules_typescript_version
ts_setup_workspace = _ts_setup_workspace
ts_library = _ts_library
ts_config = _ts_config
ts_devserver = _ts_devserver

ts_proto_library = _ts_proto_library

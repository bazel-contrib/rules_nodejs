"""
Public providers, aspects and helpers that are shipped in the built-in rules_nodejs repository.
"""

load(
    "//nodejs/private/providers:declaration_info.bzl",
    _DeclarationInfo = "DeclarationInfo",
    _declaration_info = "declaration_info",
)
load(
    "//nodejs/private/providers:js_providers.bzl",
    _JSModuleInfo = "JSModuleInfo",
    _js_module_info = "js_module_info",
)
load(
    "//nodejs/private/providers:linkable_package_info.bzl",
    _LinkablePackageInfo = "LinkablePackageInfo",
)
load(
    "//nodejs/private/providers:directory_file_path_info.bzl",
    _DirectoryFilePathInfo = "DirectoryFilePathInfo",
)
load(
    "//nodejs/private/providers:user_build_settings.bzl",
    _UserBuildSettingInfo = "UserBuildSettingInfo",
)

DeclarationInfo = _DeclarationInfo
declaration_info = _declaration_info
JSModuleInfo = _JSModuleInfo
js_module_info = _js_module_info
LinkablePackageInfo = _LinkablePackageInfo
DirectoryFilePathInfo = _DirectoryFilePathInfo
UserBuildSettingInfo = _UserBuildSettingInfo

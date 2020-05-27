load("@npm//@vue/cli-service:index.bzl", "vue_cli_service")
load("@build_bazel_rules_nodejs//:index.bzl", "npm_package_bin") 

vue_cli_service(
	name = "serve",
  data = [":package.json",
					":package-lock.json",
					"babel.config.js",
					"@npm//:node_modules",
          "//src:srcfiles",],
  args = ["serve"],
)

vue_cli_service(
	name = "build",
  data = [":package.json",
					":package-lock.json",
					"babel.config.js",
					"@npm//:node_modules",
          "//src:srcfiles",],
  args = ["build","--dest", "$(@D)/dist"],
  outs = ["dist"]
)


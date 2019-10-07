load("@k8s_deploy//:defaults.bzl", "k8s_deploy")

package(default_visibility = ["//:__subpackages__"])

# ts_library and ng_module use the `//:tsconfig.json` target
# by default. This alias allows omitting explicit tsconfig
# attribute.
alias(
    name = "tsconfig.json",
    actual = "//src:tsconfig.json",
)

k8s_deploy(
    name = "deploy",
    images = {
        "gcr.io/internal-200822/src:nodejs_image": "//src:image",
    },
    template = ":deployment.yaml",
)

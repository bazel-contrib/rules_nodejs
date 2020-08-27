load("@npm//webpack-dev-server:index.bzl", server = "webpack_dev_server")

server(
    name = "server",
    args = [
        "--hot",
        " --watch-poll",
        "--config webpack.config.js"
    ],
    data = [
        "public/index.html",
        "src/index.tsx",
        "tsconfig.json",
        "webpack.config.js"
    ],
)
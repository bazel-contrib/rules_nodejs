# ts_proto_library

Bazel rule for generating TypeScript declarations for JavaScript protocol buffers 
and GRPC Web service definitions using the [grpc-web](https://github.com/grpc/grpc-web)
protoc plugin.

## Getting Started

Before you can use `ts_proto_library`, you must first setup:

- [rules_proto](https://github.com/bazelbuild/rules_proto)
- [rules_nodejs](https://github.com/bazelbuild/rules_nodejs)

Once those are setup, add the following to your workspace:

```python
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# TODO: Setup rules_proto
# TODO: Setup rules_nodejs

load("//packages/labs:package.bzl", "npm_bazel_labs_dependencies")

npm_bazel_labs_dependencies()
```

Then, in your `BUILD` file:

```python
load("@rules_proto//:index.bzl", "typescript_proto_library")
load("//packages/labs:index.bzl", "ts_proto_library")

proto_library(
  name = "test_proto",
  srcs = [
    "test.proto",
  ],
)

ts_proto_library(
  name = "test_ts_proto",
  proto = ":test_proto",
)
```

You can now use the `test_ts_proto` target as a `dep` in other `ts_project` targets. However, you will need to include the following dependencies at runtime yourself:

- `@types/google-protobuf`
- `grpc-web`

See `//examples/protocol_buffers/BUILD.bazel` for an example.

## IDE Code Completion

To get code completion working for the generated protos in your IDE, add the following to your
`tsconfig.json`:

```js
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      // Replace <workspace-name> with the name of your workspace
      "<workspace-name>/*": [
        "*", // Enables absolute paths for src files in your project
        "bazel-bin/*" // Enables referencing generate protos with absolute paths
      ]
    }
  }
}
```


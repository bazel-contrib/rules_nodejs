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

You can now use the `test_ts_proto` target as a `dep` in other `ts_library` targets. However, you will need to include the following dependencies at runtime yourself:

- `google-protobuf`
- `grpc-web`

UMD versions of these runtime dependencies are provided by `//packages/labs/grpc_web:bootstrap_scripts` (for use within `ts_devserver` and `karma_web_test_suite`)

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

## Implementation Details
A bazel aspect is used to generate `ts_library` compatible output for all transitive
dependencies of the proto passed to `ts_proto_library`.

In its current state (as of March 15, 2020) the `grpc` protoc plugin is not fully capable of
producing typescript source files. It is however, capable of generating type declarations and
`commonjs` implementations. To make these output's compatible with `ts_library` the generated
`commonjs` output is transformed into both ES5 UMD module files and ES6 module files.

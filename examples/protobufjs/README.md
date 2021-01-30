# protobufjs example

This shows how the [protobuf.js](https://github.com/protobufjs/protobuf.js)
build tools and runtime library can be used to consume `.proto` files.

Note that the example requires some "userland" code to invoke the tools,
since there is no "custom rule" to invoke them under Bazel.
See `defs.bzl` for the sample code you will need.

Currently the example doesn't exercise the Service definitions in the proto,
but we expect this is easily added. It would be a great community contribution.

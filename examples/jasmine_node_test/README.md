# Jasmine node tests

The `jasmine_node_test` rule will match files ending with `spec.js` and
`test.js`. The character before the file ending must be a non-alphanumeric
character. For example, files that end with `_spec.js` or `.spec.js` will work.

## Additional file customization

In addition, you could customize the file ending right before the `.js` file
extension. The following must be valid:

- The character right after either `spec` or `test` must be either a dash,
  underscore, or period.
- After the dash, underscore, or period, there should be a valid alphanumeric
  string.

For example, files named `_spec-unit.js` or `.spec-unit.js` will work.

## Using TypeScript spec files with `jasmine_node_test`

For TypeScript spec files, you will need to create a separate `ts_library` for
your spec and bring it in as a `deps`. In the [BUILD.bazel](BUILD.bazel) example
we create two separate `ts_library` files and bring both in as `deps`.

```
ts_library(
    name = "decrement",
    srcs = [
        "decrement.ts",
    ],
)
 ts_library(
    name = "decrement_spec",
    srcs = [
        "decrement.spec.ts",
        "decrement.spec-foo.ts",
    ],
    deps = [
        ":decrement",
        "@npm//@types/jasmine",
    ],
)
 jasmine_node_test(
    name = "decrement_test",
    deps = [
        ":decrement_spec",
        "@npm//jasmine",
    ],
)
```

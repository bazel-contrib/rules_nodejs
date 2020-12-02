# Jest example

This example shows how you might use the Jest testing framework

It has a utility macro in `jest.bzl` which makes a more ergonomic API for calling the `jest_test` rule in `@npm//jest-cli:index.bzl`. We suggest copying that to your repo.

## Running on Windows

To make the tests running on windows as well you have to add the `--enable_runfiles` flag to your `.bazelrc`.
This requires running under elevated privileges (Admin rights), Windows 10 Creators Update (1703) or later system version, and enabling developer mode.

```
build --enable_runfiles
run --enable_runfiles
test --enable_runfiles
```

# Jest typescript example

Under `ts/` there's an example of using jest with typescript directly with generated rule from `@npm//jest-cli:index.bzl`
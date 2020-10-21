# Jest example

This example shows how you might use the Jest testing framework

It has a utility macro in `jest.bzl` which makes a more ergonomic API for calling the `jest_test` rule in `@npm//jest-cli:index.bzl`. We suggest copying that to your repo.

# Jest typescript example

Under `ts/` there's an example of using jest with typescript directly with generated rule from `@npm//jest-cli:index.bzl`
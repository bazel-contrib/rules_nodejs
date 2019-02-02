# End-to-end tests for generated npm packages

All tests that depend on the generated npm packages such as `@bazel/typescript` and `@bazel/karma` should
go in this folder.

## Running

These tests are run using `test.sh` which generates the `package.json` files in each directory before calling `yarn test`.
The `package.json` files are generated from template `package-template.json` files. The absolute locations of
the generated npm packages are substituted in when generating the `package.json` files.

### Running an individual test

To run a specific test run `yarn e2e-npm_packages --test <test_name>` where `<test_name>`
is the name of the test folder to run.

### Updating yarn.lock file

To update the `yarn.lock` files for these tests run `yarn e2e-npm_packages --update-lock-files`.

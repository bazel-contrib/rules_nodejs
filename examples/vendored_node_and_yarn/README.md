We download https://nodejs.org/dist/v10.12.0/node-v10.12.0-linux-x64.tar.xz and
https://github.com/yarnpkg/yarn/releases/download/v1.10.0/yarn-v1.10.0.tar.gz for this
test (see package.json) so that the contents of these packages do not have to be checked in.

In a real world scenario, the contents of these files can be checked into the repository,
or they could be built from source as part of the Bazel build.

# @bazel/create

This package allows users to have a very simple quickstart to get up and running with Bazel via npm or yarn.

```bash
$ yarn create @bazel
# or
$ npm init @bazel
```

See https://yarnpkg.com/en/docs/cli/create and https://docs.npmjs.com/cli/init

# Design

We version @bazel/create along with the other packages in this monorepo.

yarn and npm will download this package globally. For this reason we take no dependencies here to minimize the risk of version conflicts in the global install space.

# Bazel Webpack plugin

This plugin teaches Bazel how to run Webpack to produce JS bundles.

Run the tests:

```sh
$ yarn test
```

Or build the npm package `@bazel/webpack`:

```sh
$ yarn build
```

# TODO

1. Figure out how users should configure webpack.
    - Should they pass a webpack.config.js? This lets them run arbitrary code which can mess up the Bazel integration
    - Should we add attributes on the webpack_bundle rule?
    - In some cases maybe downstream rules configure Webpack, like the scheme for naming chunks

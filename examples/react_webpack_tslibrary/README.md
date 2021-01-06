This example shows how to use Webpack to build and serve a React app with Bazel,
using ts_library. See examples/react_webpack for a ts_project example.

We use the minimal webpack loaders, because Bazel takes care of things like Sass
and TypeScript compilation before calling Webpack.

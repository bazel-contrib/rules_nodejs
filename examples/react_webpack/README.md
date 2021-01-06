This example shows how to use Webpack to build and serve a React app with Bazel,
using ts_project. See examples/react_webpack_tslibrary for a ts_library example.

We use the minimal webpack loaders, because Bazel takes care of things like Sass
and TypeScript compilation before calling Webpack.

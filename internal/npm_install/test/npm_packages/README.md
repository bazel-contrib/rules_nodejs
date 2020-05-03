These test the installation of npm packages which contain bazel rules.
We call these "hybrid" packages because they're distributed, versioned, and installed by npm
but they contain bazel rules we can call from BUILD files.

The packages themselves are in /tools/npm_packages/bazel_workspaces*

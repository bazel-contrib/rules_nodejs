---
title: Debugging
layout: default
toc: true
---

# Debugging

Add the options in the `Support for debugging NodeJS tests` section from https://github.com/bazelbuild/rules_nodejs/blob/master/common.bazelrc to your project's `.bazelrc` file to add support for debugging NodeJS programs.

Using the `--config=debug` command line option with bazel will set a number of flags that are specified there are useful for debugging. See the comments under `Support for debugging NodeJS tests` for details on the flags that are set.

Use  `--config=debug` with `bazel test` as follow,

```
bazel test --config=debug //test:...
```

or with `bazel run`,

```
bazel run --config=debug //test:test1
```

to also turn on the NodeJS inspector agent which will break before any user code starts. You should then see,

```
Executing tests from //test:test1
-----------------------------------------------------------------------------
Debugger listening on ws://127.0.0.1:9229/3f20777a-242c-4d18-b88b-5ed4b3fed61c
For help, see: https://nodejs.org/en/docs/inspector
```

when the test is run.

To inspect with Chrome DevTools 55+, open `chrome://inspect` in a Chromium-based browser and attach to the waiting process.
A Chrome DevTools window should open and you should see `Debugger attached.` in the console.

See https://nodejs.org/en/docs/guides/debugging-getting-started/ for more details.

## Debugging with VS Code

With the above configuration you can use VS Code as your debugger.
You will first need to configure your `.vscode/launch.json`:

```
{
      "type": "node",
      "request": "attach",
      "name": "Attach nodejs_binary",
      "internalConsoleOptions": "neverOpen",
      "resolveSourceMapLocations": null,
      "sourceMapPathOverrides": {
        "../*": "${workspaceRoot}/*",
        "../../*": "${workspaceRoot}/*",
        "../../../*": "${workspaceRoot}/*",
        "../../../../*": "${workspaceRoot}/*",
        "../../../../../*": "${workspaceRoot}/*",
        // do as many levels here as needed for your project
      }
```
We use `sourceMapPathOverrides` here to rewrite the source maps produced by `ts_library` so that breakpoints line up with the source maps.
Once configured start your process with
```
bazel run --config=debug //test:test1
```
Then hit `F5` which will start the VS Code debugger with the `Attach nodejs_binary` configuration.
VS Code will immediatenly hit a breakpoint to which you can continue and debug using all the normal debug features provided.

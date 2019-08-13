# Worker example

This shows how to keep a tool running a persistent worker. This is like a daemon process that Bazel will start and manage as needed to perform actions.

Bazel's protocol for workers is:

- start a pool of processes
- when an action needs to be run, it encodes the request as a protocol buffer and writes it to the worker's stdin
- the `@bazel/worker` package provides a utility to speak this protocol, and dispatches to a function you provide that performs the work of the tool. See /packages/worker/README.md for a description of that utility.
- the tool returns a response written as another protocol buffer to stdout (note this means you cannot log to stdout)

## Files in the example

`foo.js` is some arbitrary input to the rule. You can run `ibazel build :do_work` and then make edits to this JS input to observe how every change triggers the action to run, and it's quite fast because the worker process stays running.

The `tool.js` file shows how to use the `@bazel/worker` package to implement the worker protocol.
Note that the main method first checks whether the tool is being run under the worker mode, or should just do the work once and exit.

`uses_workers.bzl` shows how the tool is wrapped in a Bazel rule. When the action is declared, we mark it with attribute `execution_requirements = {"supports-workers": "1"}` which informs Bazel that it speaks the worker protocol. Bazel will decide whether to actually keep the process running as a persistent worker.

By also providing `mnemonic` attribute to the action, users will be able to control the scheduling if desired.
Note the `--strategy=DoWork=standalone` flag passed to Bazel in the integration test in the /examples directory. This tells Bazel not to use workers. Similarly the user could set some other strategy like `--strategy=DoWork=worker` to explicitly opt-in.

`BUILD.bazel` defines the binary for the tool, then shows how it would be used by calling `work()`. Note that the usage site just calls the rule without knowing whether it uses workers for performance.


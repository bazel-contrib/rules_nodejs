# Bazel Worker support

Bazel workers allow actions to be executed by a program that stays running.

Learn more about Bazel workers from Mike Morearty's [medium article](https://medium.com/@mmorearty/how-to-create-a-persistent-worker-for-bazel-7738bba2cabb)

## Typical usage

Read `index.d.ts` for the worker API. Essentially you call `runWorkerLoop` passing it a function to call back when each build request arrives.

See the [worker example] for a full example with comments.

[worker example]: https://github.com/bazelbuild/rules_nodejs/tree/stable/examples/worker

## Restrictions on programs that run as a worker

Accept arguments as a params file

stdin and stdout of the process are reserved for the worker protocol with Bazel.
That means anything that does a `console.log` can cause an error.
Bazel prints a snippet of whatever was printed to stdout to help you track it down.
Writing to stderr is fine, for example with `console.error`.
In the future, we might improve this worker library to patch out the nodejs console.log function so that it doesn't interfere with the worker protocol.

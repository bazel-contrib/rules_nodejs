<!-- FIXME(alexeagle): generate the docs from the sources -->

## All promises in async functions must be used

When using `async` / `await`, it can be easy to forget to `await` a promise
which can result in async tasks running in an unexpected order. Thus, we require
that every promise in an `async` function is consumed in some way, so that
there's a well-defined order in which async tasks are resolved. To fix this
check, you can do one of the following:

1. Remove `async` from the function, and instead use normal promise chaining.
2. `await` the promise.
3. Assign the promise to a variable and `await` it later.

As a last resort, if you really want to use `async` and can't `await` the promise,
you can just assign it to a variable, like so

    let ignoredPromise = returnsPromise();

This makes your intent to ignore the result of the promise explicit, although it
may cause "declared but never used" warning with some linters.

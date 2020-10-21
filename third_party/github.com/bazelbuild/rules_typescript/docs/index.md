# Tsetse

It's common for even the best programmers to make simple mistakes. And sometimes
a refactoring which seems safe can leave behind code which will never do what's
intended.

The TypeScript compiler helps prevent a lot of the mistakes you might make when
writing JavaScript code. However, the set of checks it performs are limited.
You can augment the static analysis of the compiler by adding linting rules, but
many toolchains only run the linter when the code is ready for review or submit.
We want to catch correctness issues in the same way the compiler catches type
errors.

You can think of the TypeScript compiler as a linter for the Language Spec.
Tsetse is essentially an extension to that spec, adding new patterns which are
disallowed in TypeScript programs. The tsetse library lets us plug new
third-party checks into the standard compiler.

__Tsetse ...__

* __hooks into the standard build process, so all developers run it without configuration__
* __tells you about mistakes immediately after they're made__
* __produces suggested fixes, so you can turn on new checks without breaking your build__

Currently, Tsetse is built into the Bazel TypeScript compiler. However we hope
that it will be possible to plug into the standard `tsc` compiler later.

Tsetse is modelled on the [Error Prone] project for Java.

[Error Prone]: https://errorprone.info

## Example

```javascript
const s = " Hello, world! ";
s.trim();
```

```sh
$ bazel build :all
mycode.ts(2,1): error TS21222: return value is unused.
  See http://tsetse.info/check-return-value
```

## Rules

* [Ban expect truthy promise](./ban-expect-truthy-promise)
* [Ban promise as condition](./ban-promise-as-condition)
* [Check return value](./check-return-value)
* [Equals NaN](./equals-nan)
* [Must use promises](./must-use-promises)

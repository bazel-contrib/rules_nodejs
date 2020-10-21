<!-- FIXME(alexeagle): generate the docs from the sources -->

## The problem

Certain functions do not change the state of the calling object. If these
functions' return values are unused, then the function call could be removed
without any effects, indicating a likely bug.

Currently checking the following APIs:

*   `Array.concat()`
*   `Array.filter()`
*   `Array.map()`
*   `Array.slice()`
*   `Function.bind()`
*   `Object.create()`
*   `string.concat()`
*   `string.normalize()`
*   `string.padStart()`
*   `string.padEnd()`
*   `string.repeat()`
*   `string.replace()` (Check only if the second parameter is non-function.)
*   `string.slice()`
*   `string.split()`
*   `string.substr()`
*   `string.substring()`
*   `string.toLocaleLowerCase()`
*   `string.toLocaleUpperCase()`
*   `string.toLowerCase()`
*   `string.toUpperCase()`
*   `string.trim()`

For user defined functions, add a `@checkReturnValue` JSDoc to mark functions
whose return values should be checked. See this
[example](https://github.com/bazelbuild/rules_typescript/tree/master/internal/tsetse/tests/check_return_value/user_defined_check_return_value.ts).

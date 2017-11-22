<!-- FIXME(alexeagle): generate the docs from the sources -->

## Equals NaN rule

Checking whether any value is equal to the special numeric value `NaN` will
always return false, by the spec. If you want to check whether a value is the
NaN value, use either the built-in [`isNaN`][1] function or the ES2015 function
[`Number.isNaN`][2].

[1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN
[2]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN

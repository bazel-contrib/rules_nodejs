## Example

```js
// test.js
const el = document.createElement('div');
el.innerText = 'Hello, JS';
el.className = 'js1';
document.body.appendChild(el);
```

```py
# BUILD.bazel
load("@build_bazel_rules_nodejs//internal/js_library/v2:js_library.bzl", "js_library")

js_library(
    name = "src",
    srcs = ["test.js"],
)

load("@build_bazel_rules_typescript//:defs.bzl", "ts_devserver")

ts_devserver(
    name = "devserver",
    entry_module = "path/to/test",
    serving_path = "/bundle.min.js",
    deps = [":src"],
)
```

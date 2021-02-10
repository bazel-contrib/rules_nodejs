# @bazel/node-patches

Runtime modifications to nodejs internals to help node/npm distributed programs run in bazel

## fs

patch any `fs` like object such that symlinks that point outside a specified directory seem to be their targets instead of links

### example

```js
const fs = require('fs')
const path = require('path')
const patcher = require('@bazel/node-patches')

patcher.fs(fs,'/my/files')

fs.symlinkSync(path.resolve('./node_modules'),'/my/files/node_modules')

// now try to stat.

const stat = fs.lstatSync('/my/files/node_modules')

console.log(stat.isSymbolicLink() === false)// true

console.log(stat.isDirectory() === true) //true

```

this should not change the behavior of any paths that are outside of the root.

### loader

you can use the register script to include it in a -r flag to preload the patch before user code.
This depends on setting the environment variable BAZEL_PATCH_ROOTS

```sh
BAZEL_PATCH_ROOTS=~/.cache/bazel node -r @bazel/node-patches/register <your app js>
```

### api

`{fs} = require('@bazel/node-patches')`
  - fs(fsLikeObject: require('fs'), root:string)

## bazel

to use this package as a dependency in bazel depend on it's exposed file group rule.

`:node_patches`

this filegroup will always expose one or more files needed to run this package and will not depend on npm install etc.
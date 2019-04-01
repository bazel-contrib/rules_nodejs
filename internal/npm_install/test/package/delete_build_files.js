/**
 * @fileoverview
 * BUILD files in node modules have to be deleted because runfiles are not used
 * on Windows. On Windows, the `package` glob sees *all* files because
 * `generate_build_file.js` deletes BUILD files from the actual source.
 * On other systems, the glob does not cross package boundary, so only a subset
 * of files are included in runfiles. Deleting the Bazel files in postinstall
 * allows other systems to match the behavior on Windows.
 */

const fs = require('fs');

const files = [
  "node_modules/rxjs/src/webSocket/BUILD.bazel",
  "node_modules/rxjs/src/operators/BUILD.bazel",
  "node_modules/rxjs/src/testing/BUILD.bazel",
  "node_modules/rxjs/src/BUILD.bazel",
  "node_modules/rxjs/src/ajax/BUILD.bazel",
];

for (const file of files) {
  fs.unlinkSync(file);
}

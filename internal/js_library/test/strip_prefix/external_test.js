// Verify that we can load very_testy which is setup as a link
// to a js_library with external files. See manual_build_file_contents of
// @npm yarn_install in npm_deps.bzl
const packageJson = require("very_testy/package.json")
if (packageJson.name != "testy") {
    const msg = `Expecting to require testy package via very_testy link of js_library with external files but got ${packageJson.name}`;
    throw new Error(msg)
}

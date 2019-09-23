// First-party package from ./static_linked_pkg
// it should get resolved through runfiles
const a = require('static_linked');
// First-party package from ./dynamic_linked_pkg
// it should get resolved from the execroot
const b = require('dynamic_linked');
// We've always supported `require('my_workspace')` for absolute imports like Google does it
const c = require('build_bazel_rules_nodejs/internal/linker/test/integration/absolute_import');

// Third-party package installed in the root node_modules
const semver = require('semver');

// This output should match what's in the golden.txt file
console.log(a.addA(b.addB(c.addC(semver.clean(' =v1.2.3 ')))));

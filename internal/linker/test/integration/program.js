// First-party package from ./static_linked_pkg
// it should get resolved through runfiles
const a = require('static_linked');
// First-party package from ./dynamic_linked_pkg
// it should get resolved from the execroot
const b = require('dynamic_linked');
// Third-party package installed in the root node_modules
const semver = require('semver');

// This output should match what's in the golden.txt file
console.log(a.addA(b.addB(semver.clean(' =v1.2.3 '))));

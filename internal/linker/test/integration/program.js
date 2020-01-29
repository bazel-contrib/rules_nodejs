// First-party "static linked" packages
// they should get resolved through runfiles
const a = require('static_linked');
const e = require('@linker_scoped/static_linked');
const t = require('transitive_static_linked');
// First-party "dynamic linked" packages
// they should get resolved from the execroot
const b = require('dynamic_linked');
const d = require('@linker_scoped/dynamic_linked');
// We've always supported `require('my_workspace')` for absolute imports like Google does it
const c = require('build_bazel_rules_nodejs/internal/linker/test/integration/absolute_import');

// Third-party package installed in the root node_modules
const semver = require('semver');

// This output should match what's in the golden.txt file
console.log(t.addT(e.addE(d.addD(c.addC(b.addB(a.addA(semver.clean(' =v1.2.3 '))))))));

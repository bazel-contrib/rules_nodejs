// First-party "static linked" packages
// they should get resolved through runfiles
const a = require('static_linked');
const e = require('@linker_scoped/static_linked');
const t = require('transitive_static_linked');
// First-party "dynamic linked" packages
// they should get resolved from the execroot
const b = require('dynamic_linked');
const d = require('@linker_scoped/dynamic_linked');

let c;
try {
  // As of 2.0, we no longer support `require('my_workspace/path/to/output/file.js')` for absolute
  // imports
  c = require('build_bazel_rules_nodejs/internal/linker/test/integration/absolute_import');
  console.error('should have failed');
  process.exit(1);
} catch (_) {
  // You now need to use the runfiles helper library to resolve absolute workspace imports
  const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
  c = require(runfiles.resolve(
      'build_bazel_rules_nodejs/internal/linker/test/integration/absolute_import'));
}

// Third-party package installed in the root node_modules
const semver = require('semver');

// This output should match what's in the golden.txt file
console.log(t.addT(e.addE(d.addD(c.addC(b.addB(a.addA(semver.clean(' =v1.2.3 '))))))));

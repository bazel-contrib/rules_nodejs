/**
 * @fileoverview
 * This script is run as part of the nodejs binary bootstrapping process.
 * It is required because generate_build_file.js imports ng_apf_library.js
 * from the same directory it is in. This script moves the dependency to the
 * right location to simulate Bazel copy the template to npm/external.
 */

const path = require('path');
const fs = require('fs');

let source, dist;
const {RUNFILES_MANIFEST_FILE, TEST_TARGET} = process.env;

// Read the manifest only when running under `bazel test`.
if (TEST_TARGET && RUNFILES_MANIFEST_FILE) {
  // This code path is executed on Windows where runfiles are not used.
  const manifest = fs.readFileSync(RUNFILES_MANIFEST_FILE, 'utf-8');
  const entry = manifest.split('\n').find(line => {
    return line.startsWith("build_bazel_rules_nodejs/internal/ng_apf_library/ng_apf_library.js");
  });
  if (!entry) {
    throw new Error(`Could not find entry for 'ng_apf_library.js' in MANIFEST`);
  }
  source = entry.split(' ')[1];
  dest = path.resolve(source, '../../npm_install/ng_apf_library.js');
} else {
  // For generating the golden files under `bazel run`.
  source = 'internal/ng_apf_library/ng_apf_library.js';
  dest = 'internal/npm_install/ng_apf_library.js';
}

fs.copyFileSync(source, dest);

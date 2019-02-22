global.foobar = 1;

require('zone.js/dist/zone-node.js');
require('zone.js/dist/long-stack-trace-zone.js');
require('zone.js/dist/proxy.js');
require('zone.js/dist/sync-test.js');
require('zone.js/dist/async-test.js');
require('zone.js/dist/fake-async-test.js');
require('zone.js/dist/task-tracking.js');

// This hack is needed to get jasmine, node and zone working inside bazel.
// Initialize jasmine by calling jasmineCore boot. This will initialize
// global.jasmine so that it can be patched by zone.js jasmine-patch.js.
let jasmineCore;
try {
  // Try unhoisted jasmine-core first so that we don't
  // need an @npm//jasmine-core dep in the unhoisted case.
  jasmineCore = require('jasmine/node_modules/jasmine-core');
} catch (_) {
  jasmineCore = require('jasmine-core');
}
jasmineCore.boot(jasmineCore);

// Test that a bootstrap afterEach() is preserved in the jasmine tests
afterEach(() => global.foobar++);

// Test that the jasmine zone patch is preserved in the jasmine tests
require('zone.js/dist/jasmine-patch.js');

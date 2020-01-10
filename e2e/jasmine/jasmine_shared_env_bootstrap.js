global.foobar = 1;

require('zone.js/dist/zone-node.js');
require('zone.js/dist/long-stack-trace-zone.js');
require('zone.js/dist/proxy.js');
require('zone.js/dist/sync-test.js');
require('zone.js/dist/async-test.js');
require('zone.js/dist/fake-async-test.js');
require('zone.js/dist/task-tracking.js');

// Initialize jasmine with @bazel/jasmine boot() function. This will initialize
// global.jasmine so that it can be patched by zone.js jasmine-patch.js.
require('@bazel/jasmine').boot();

// Test that a bootstrap afterEach() is preserved in the jasmine tests
afterEach(() => global.foobar++);

// Test that the jasmine zone patch is preserved in the jasmine tests
require('zone.js/dist/jasmine-patch.js');

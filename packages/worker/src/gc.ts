// Equivalent of running node with --expose-gc
// but easier to write tooling since we don't need to inject that arg to
// nodejs_binary
// TODO: reconsider this once we support multiplex workers 
// and workers are run via worker_threads
if (typeof global.gc !== 'function') {
    // tslint:disable-next-line:no-require-imports
    require('v8').setFlagsFromString('--expose_gc');
    // tslint:disable-next-line:no-require-imports
    global.gc = require('vm').runInNewContext('gc');
}

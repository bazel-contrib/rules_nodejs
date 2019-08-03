const fs = require('fs');

describe('ts_web_test_suite', () => {
  let config;

  beforeAll(() => {
    config = fs.readFileSync(
        require.resolve('e2e_karma_typescript/testing_wrapped_test.conf.js'), 'utf-8');
  });

  it('should load default bootstrap files', () => {
    const match = config.match(/\/\/ BEGIN BOOTSTRAP FILES(.*?)\/\/ END BOOTSTRAP FILES/s);
    expect(match).toBeTruthy();
    const files = match.pop().split(',').map(l => {
      // remove leading and trailing whitepaces, and begin quote and end quote.
      return l.trim().slice(1, -1);
    }).filter(l => !!l);
    expect(files).toEqual([
      'NODE_MODULES/requirejs/require.js',
      'NODE_MODULES/karma-requirejs/lib/adapter.js',
      'e2e_karma_typescript/_testing_wrapped_test.amd_names_shim.js',
    ]);
  });

  it('should only collect node_sources and dev_scripts in user files', () => {
    const match = config.match(/\/\/ BEGIN USER FILES(.*?)\/\/ END USER FILES/s);
    expect(match).toBeTruthy();
    const files = match.pop().split(',').map(l => {
      // remove leading and trailing whitepaces, and begin quote and end quote.
      return l.trim().slice(1, -1);
    }).filter(l => !!l);
    // These are files that Karma should load, they are not necessarily
    // topologically sorted.
    expect(files).toEqual([
      'e2e_karma_typescript/foobar.js',
      'e2e_karma_typescript/hello_world.spec.js',
      'e2e_karma_typescript/decrement.spec.js',
      'e2e_karma_typescript/foobar.spec.js',
      'e2e_karma_typescript/decrement.js',
      'npm/node_modules/rxjs/bundles/rxjs.umd.js',
      'e2e_karma_typescript/rxjs_shims.js',
      'e2e_karma_typescript/hello_world.js',
    ]);
  });
});

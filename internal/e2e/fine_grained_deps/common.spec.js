describe('dependencies', () => {
  it('should get the typescript library', () => {
    const ts = require('typescript');
    expect(ts.version).toBe('3.0.3');
  });

  it(`should resolve transitive dependencies
  Note that jasmine-core is not listed in our deps[]
  but it is a transitive dependency of jasmine, which is in our deps.`,
     () => {
       require('jasmine-core');
     });

  it(`should resolve ajv/lib/$data`, () => {
    require('ajv/lib/$data');
  });

  it(`should resolve rxjs/src/tsconfig.json`, () => {
    // the BUILD.bazel file in rxjs/src should have been
    // deleted by fine grained deps and rxjs/src/tsconfig.json
    // should be available in the runfiles
    require('rxjs/src/tsconfig.json');
  });

  it(`should resolve @gregmagolan/test-b to version 0.0.2 with a @gregmagolan/test-a dependency of 0.0.1
  Note that @gregmagolan/test-a@0.0.2 is an explicit devDependency of this project,
  so we are really testing that test-b will get the version it depends on, not
  the hoisted one.`,
     () => {
       const testB = require('@gregmagolan/test-b');
       expect(testB).toEqual('test-b-0.0.2/test-a-0.0.1');
     });

  it(`should fail to resolve @bazel/bazel/bazel since the @bazel/bazel package should have been excluded
  from the install by default value of excluded_packages`,
     () => {
       try {
         require('@bazel/bazel/bazel');
         fail('@bazel/bazel/bazel should not be resolved');
       } catch (err) {
         expect(err.code).toBe('MODULE_NOT_FOUND');
       }
     });
});

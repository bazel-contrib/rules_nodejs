define(
    'rules_nodejs/packages/karma/test/karma/amd-modules.spec', ['require'], require => {
      describe('AMD module loading', () => {
        describe('unnamed amd modules', () => {
          it('should not warn if module is configured as static file', doneFn => {
            spyOn(console, 'error');

            require(['unnamed-module'], () => {
              // Loading such an anonymous AMD module should not cause any error messages about
              // a missing timestamp. This is a limitation of the "karma-requirejs" plugin which
              // by default always prints an error for requests through Karma's proxy.
              // See: https://github.com/karma-runner/karma-requirejs/issues/6
              expect(console.error).toHaveBeenCalledTimes(0);
              doneFn();
            });
          });

          it('should warn if module is not specified as static file', doneFn => {
            spyOn(console, 'error').and.callThrough();

            require(
                ['unnamed-module-invalid-file'],
                /* loaded callback */ () => {},
                /* error callback */ () => {
                  expect(console.error)
                      .toHaveBeenCalledWith(jasmine.stringMatching(/no timestamp/));
                  doneFn();
                });
          });
        });
      });
    });

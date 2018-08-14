describe('dependencies', () => {
  it('should fail to resolve test-a since it has not been specified as a fine-grained direct dependency',
     () => {
       try {
         require('@gregmagolan/test-a');
         fail('@gregmagolan/test-a should not be resolved');
       } catch (err) {
         expect(err.code).toBe('MODULE_NOT_FOUND');
       }
     });
});

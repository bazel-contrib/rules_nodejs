import indexfile from './index.js';

test('it should work', () => {
  expect(indexfile).toBe('test');
});

test('snapshot', function() {
  expect(indexfile).toMatchSnapshot();
})

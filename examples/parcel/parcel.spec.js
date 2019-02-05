const fs = require('fs');

describe('bundling', () => {
  it('should work', () => {
    let written;
    console.log = (m) => written = m;
    const bundle = require('parcel_example/bundle.js');
    expect(written).toEqual('Hello, Bob');
  });
});

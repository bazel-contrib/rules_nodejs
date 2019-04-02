const fs = require('fs');

describe('bundling', () => {
  it('should work', () => {
    let written;
    console.log = (m) => written = m;
    const bundle = require('examples_parcel/bundle.js');
    expect(written).toEqual('Hello, Bob');
  });
});

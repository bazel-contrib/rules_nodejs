import {Car} from './car';
import Long = require('long');

describe('protocol buffers', () => {

  it('allows creation of an object described by proto', () => {
    const pontiac = Car.create({
      make: "pontiac",
      frontTires: {
        width: 225,
        aspectRatio: 65,
        construction: 'R',
        diameter: 17,
      },
    });
    expect(pontiac.make).toEqual('pontiac');
    if (!pontiac.frontTires) {
      fail('Should have frontTires set');
    } else {
      expect(pontiac.frontTires.width).toEqual(225);
    }
  });

  // Asserts that longs are handled correctly.
  // This value comes from https://github.com/dcodeIO/long.js#background
  it('handles long values correctly', () => {
    const pontiac = Car.create({
      make: "pontiac",
      // Long.MAX_VALUE
      mileage: new Long(0xFFFFFFFF, 0x7FFFFFFF),
    });
    const object = Car.toObject(pontiac, {longs: String});
    expect(object["mileage"]).toEqual("9223372036854775807");
  });
});

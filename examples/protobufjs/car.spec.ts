import {Proto as pb} from './car_pb';

describe('protocol buffers', () => {
  it('allows creation of an object described by proto', () => {
    const tires = pb.Tire.create();
    tires.aspectRatio = 65;
    tires.width = 225;
    tires.construction = 'R';
    tires.diameter = 17;

    const pontiac = pb.Car.create();
    pontiac.make = 'pontiac';
    pontiac.frontTires = tires;

    expect(pontiac.make).toEqual('pontiac');
  });
});

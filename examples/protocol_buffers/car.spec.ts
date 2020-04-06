import {Car} from './car_pb';
import {Tire} from './tire_pb';

describe('protocol buffers', () => {
  it('allows creation of an object described by proto', () => {
    const tires = new Tire();
    tires.setAspectRatio(65);
    tires.setWidth(225);
    tires.setConstruction('R');
    tires.setDiameter(17);

    const pontiac = new Car();
    pontiac.setMake('pontiac');
    pontiac.setFrontTires(tires)

    expect(pontiac.getMake()).toEqual('pontiac');
  });
});

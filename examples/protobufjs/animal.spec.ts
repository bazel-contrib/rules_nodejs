import {Proto as pb} from './car_and_animal_pb';

describe('protocol buffers', () => {
  it('allows creation of an object described by proto', () => {
    const animal = pb.Animal.create({name: "cat", hasFur: true});

    expect(animal.name).toEqual("cat");
    expect(animal.hasFur).toEqual(true);
  });
});

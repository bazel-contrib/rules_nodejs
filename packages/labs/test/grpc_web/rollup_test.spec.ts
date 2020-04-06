const grpcWeb = require('grpc-web');
grpcWeb.MethodType = {
  UNARY: 'unary',
};
const bundle = require('./test_es6_bundling');

describe('Rollup', () => {
  it('should define Pizza with protobuf API', () => {
    expect(bundle.Pizza).toBeDefined();
    const pizza = new bundle.Pizza();
    pizza.setSize(bundle.PizzaSize.PIZZA_SIZE_LARGE);
    expect(pizza.getSize()).toBe(bundle.PizzaSize.PIZZA_SIZE_LARGE);
    expect(Array.isArray(pizza.getToppingIdsList())).toBe(true);
  });

  it('should define DeliveryPerson', () => {
    expect(bundle.DeliveryPerson).toBeDefined();
    expect(new bundle.DeliveryPerson()).toBeTruthy();
  });
});

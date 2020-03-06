import deliveryPersonPb = require('build_bazel_rules_nodejs/packages/labs/test/grpc_web/proto/common/delivery_person_pb');
import {PizzaServiceClient} from 'build_bazel_rules_nodejs/packages/labs/test/grpc_web/proto/pizza_service_grpc_web_pb';

describe('CommonJs', () => {
  it('Loads imports using require()', () => {
    expect(deliveryPersonPb).toBeDefined();

    const person = new deliveryPersonPb.DeliveryPerson();
    person.setName('Doug');
    expect(person).toBeDefined();
  });

  it('Loads imports using TS from syntax', () => {
    expect(PizzaServiceClient).toBeDefined();
  });
});

// Demonstrate an import of an external protobuf that has no explicit
// ts_proto_lib rule in the external repository.


// Change to some supported method of importing an external proto.
import {LatLng} from '@go_googleapis//google/type:latlng_proto';

describe('protocol buffers', () => {
    it('allows creation of an object described by proto', () => {
        const ll = new LatLng();
        ll.setLatitude(65);
        ll.setLongitude(100);
        expect(ll.getLatitude()).toEqual(65);
        expect(ll.getLongitude()).toEqual(100);
  });
});

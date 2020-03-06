import * as request from 'supertest';

import {bootstrap, bootstrapCluster} from './main';

describe('App', () => {
  it(`GET /`, async () => {
    const server = await bootstrap(3000);
    await request(server.getHttpServer()).get('/hello').expect(200).expect({
      message: 'Hello world!'
    });
    await server.close();
  });
});
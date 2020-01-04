import {INestApplication} from '@nestjs/common';
import * as request from 'supertest';

import {bootstrap} from './main';

describe('App', () => {
  let server: INestApplication;

  beforeAll(async () => {
    server = await bootstrap(3000);
  });
  afterAll(async () => {
    await server.close();
  })

  it(`GET /`, () => {
    return request(server.getHttpServer()).get('/hello').expect(200).expect({
      message: 'Hello world!'
    });
  });
});
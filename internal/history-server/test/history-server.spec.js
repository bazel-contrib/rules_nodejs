const hs = require('../history-server');
const http = require('http');
const path = require('path');

describe('history server', () => {
  let server;
  beforeEach(() => {
    server = hs.startServer(
      path.resolve('internal', 'history-server', 'test'),
      9000);
  });
  afterEach(() => {
    server.close();
  });
  it('should serve on the port requested', (done) => {
    http.get('http://localhost:9000/bundle.js', (res) => {
      var data = '';

      res.on('data', function (chunk) {
        data += chunk;
      });

      res.on('end', () => {
        expect(data.trim()).toEqual('const js_content = 1;')
        done();
      });
    });

  });
});
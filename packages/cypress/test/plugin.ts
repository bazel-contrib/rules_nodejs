import * as express from 'express';

// TODO(mrmeku): Show case a way to launch a devserver bazel target.
module.exports = (on, config) => {
  const app = express();

  app.get('/', function(req, res) {
    res.send('<html><body>hello-world</body></html>');
  });

  const port = 3000;
  app.listen(port);

  config.baseUrl = `http://localhost:${port}`;

  return config;
};

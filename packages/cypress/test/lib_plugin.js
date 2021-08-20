
const http = require('http');

module.exports = (_on, config) => {
  const hostname = '127.0.0.1';
  const port = 3000;
  const server = http.createServer((_req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('<html><body>hello-world</body></html>');
  });

  server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });

  config.baseUrl = `http://${hostname}:${port}`;

  return config;
};

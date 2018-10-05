const fs = require("fs");
const path = require("path");
const { createServer } = require("history-server");

const args = process.argv.slice(2);
const config = [];
const manifestFile = process.env['RUNFILES_MANIFEST_FILE'];
if (manifestFile) {
  const manifest = fs.readFileSync(manifestFile, {encoding: 'utf-8'})
    .split(/\r?\n/).filter(f => !!f);
  manifest.map(line => line.split(' ')).forEach(pair => {
    config.push({path: `/${path.relative('angular_bazel_example/src', pair[0])}`, root: pair[1]});
  });
}

// if (process.env['RUNFILES_MANIFEST_ONLY']) {
//   console.error("We seem to need a manifest");
// }

const server = createServer(config);
// [
//   // Any request that begins with "/one" will use apps/one/index.html
//   {
//     path: "/one",
//     root: path.resolve(__dirname, "apps/one")
//   },

//   // Any request that begins with "/two/three" will serve apps/two/index.html
//   {
//     path: "/two/three",
//     root: path.resolve(__dirname, "apps/two")
//   },

//   // Any request that begins with "/two" will serve apps/two/index.html
//   {
//     path: "/two",
//     root: path.resolve(__dirname, "apps/two")
//   },

//   // Proxies all requests to "/proxy" through to another host
//   {
//     path: "/proxy",
//     proxy: "http://www.example.com/path"
//   }
// ]);
const port = 8080
server.listen(port, () => {
  console.log("prodserver running at http://localhost:%s/index.html\nCtrl+C to stop", port);
});
// assumes the working directory contains _package.json
const fs = require('fs');
const {dirname} = require('path');
const dest = process.argv[2];

function mkdirp(p) {
  if (!fs.existsSync(p)) {
    mkdirp(dirname(p));
    fs.mkdirSync(p);
  }
}

mkdirp(dirname(dest));
fs.copyFileSync('_package.json', dest);

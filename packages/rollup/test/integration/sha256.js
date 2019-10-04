const crypto = require('crypto');
const fs = require('fs');
const sha256sum = crypto.createHash('sha256');
sha256sum.update(fs.readFileSync(process.argv[2], {encoding: 'utf-8'}));
fs.writeFileSync(process.argv[3], sha256sum.digest('hex'));

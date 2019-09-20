const fs = require('fs');
const path = require('path');

// argv[2] is always --output-dir
const out_dir = process.argv[3];

try {
  fs.mkdirSync(out_dir);
} catch {
}

for (const input of process.argv.slice(4)) {
  fs.copyFileSync(input, path.join(out_dir, path.basename(input)));
}

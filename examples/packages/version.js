const fs = require('fs');
var packageJsonPath = require.resolve('jsesc').replace('jsesc.js', 'package.json');
var packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
console.log(packageJson.version);

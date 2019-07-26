const fs = require('fs');

const packageJsonPath = require.resolve('jsesc').replace('jsesc.js', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));

exports.test = (expectedVersion) => {
  if (packageJson.version !== expectedVersion) {
    throw new Error(
        `package.json version should be ${expectedVersion} but was ${packageJson.version}`);
  }
}

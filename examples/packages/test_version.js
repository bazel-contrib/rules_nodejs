const fs = require('fs');
const path = require('path');

const packageJsonPath =
    require.resolve('jsesc').replace('jsesc.js', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));

exports.test = (expectedVersion) => {
  describe('package.json version', () => {
    it('should be equal to expected',
       () => { expect(packageJson.version).toBe(expectedVersion); });
  });
}

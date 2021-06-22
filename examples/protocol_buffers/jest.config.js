const path = require('path');

module.exports = {
    testEnvironment: 'node',
    // explicitly specify the path to babel.config.js relative to jest.config.js so
    // jest can find it even when jest.config.js is not in the root folder of the workspace
    transform:
        { '^.+\\.[jt]sx?$': ['babel-jest', { configFile: path.resolve(__dirname, 'babel.config.js') }] },
    testMatch: ['**/*.spec.js']
};

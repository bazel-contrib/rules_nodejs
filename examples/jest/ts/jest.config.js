module.exports = {
    testEnvironment: 'node',
    reporters: ['default'],
    testMatch: ['ts/**/*.test.js'],
    moduleNameMapper: {
        'examples_jest/(.*)': '<rootDir>/$1',
    },
};

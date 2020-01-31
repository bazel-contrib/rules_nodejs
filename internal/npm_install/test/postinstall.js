// This script is called by postinstall steps of yarn_install & npm_install rules in the root
// WORKSPACE. It tests that the environment attribute sets environment variables as expected.

const expectedYarn = 'yarn is great!';
if (process.env['BAZEL_YARN_INSTALL'] === '1' && process.env['SOME_USER_ENV'] !== expectedYarn) {
  throw `Expected SOME_USER_ENV environment variable to be set to '${
      expectedYarn}' by yarn_install but got '${process.env['SOME_USER_ENV']}'`;
}

const expectedNpm = 'npm is cool!';
if (process.env['BAZEL_NPM_INSTALL'] === '1' && process.env['SOME_USER_ENV'] !== expectedNpm) {
  throw `Expected SOME_USER_ENV environment variable to be set to '${
      expectedNpm}' by npm_install but got '${process.env['SOME_USER_ENV']}'`;
}

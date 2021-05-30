const {readFileSync, writeFileSync} = require('fs');
const esbuild = require('esbuild');

function getFlag(flag, required = true) {
  const argvFlag = process.argv.find(arg => arg.startsWith(`${flag}=`));
  if (!argvFlag) {
    if (required) {
      console.error(`Expected flag '${flag}' passed to launcher, but not found`);
      process.exit(1);
    }
    return
  }
  return argvFlag.split('=')[1];
}

function getEsbuildArgs(paramsFilePath) {
  try {
    return JSON.parse(readFileSync(paramsFilePath, {encoding: 'utf8'}));
  } catch (e) {
    console.error('Error while reading esbuild flags param file', e);
    process.exit(1);
  }
}

if (!process.env.ESBUILD_BINARY_PATH) {
  console.error('Expected enviournment variable ESBUILD_BINARY_PATH to be set', e);
  process.exit(1);
}

let args = getEsbuildArgs(getFlag('--esbuild_args'));

const userArgsFile = getFlag("--user_args", false);
if (userArgsFile) {
  args = {
    ...args,
    ...getEsbuildArgs(userArgsFile)
  };
}

const metafile = getFlag('--metafile');

const result = esbuild.buildSync(args);
writeFileSync(metafile, JSON.stringify(result.metafile));

const {readFileSync, writeFileSync} = require('fs');
const {pathToFileURL} = require('url');
const {join} = require('path');
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

async function processConfigFile(configFilePath) {
  const fullConfigFileUrl = pathToFileURL(join(process.cwd(), configFilePath));
  let config;
  try {
    config = await import(fullConfigFileUrl);
  } catch (e) {
    console.error(`Error while loading configuration '${fullConfigFileUrl}':\n`, e);
    process.exit(1);
  }

  if (!config.default) {
    console.error(`Config file '${configFilePath}' was loaded, but did not export a configuration object as default`);
    process.exit(1);
  }

  config = config.default;

  // These keys of the config can not be overriden
  const IGNORED_CONFIG_KEYS = [
    'bundle',
    'define',
    'entryPoints',
    'external',
    'metafile',
    'outdir',
    'outfile',
    'preserveSymlinks',
    'sourcemap',
    'splitting',
    'tsconfig',
  ];

  return Object.entries(config).reduce((prev, [key, value]) => {
    if (IGNORED_CONFIG_KEYS.includes(key)) {
      console.error(`[WARNING] esbuild configuration property '${key}' from '${configFilePath}' will be ignored and overriden`);
    } else {
      prev[key] = value;
    }
    return prev;
  }, {});
}

if (!process.env.ESBUILD_BINARY_PATH) {
  console.error('Expected enviournment variable ESBUILD_BINARY_PATH to be set', e);
  process.exit(1);
}

async function runOneBuild(args, userArgsFilePath, configFilePath) {
  if (userArgsFilePath) {
    args = {
      ...args,
      ...getEsbuildArgs(userArgsFilePath)
    }
  }
  
  if (configFilePath) {
    const config = await processConfigFile(configFilePath);
    args = {
      ...args,
      ...config
    };
  }
  
  const metafile = getFlag('--metafile');
  
  try {
    const result = await esbuild.build(args);
    writeFileSync(metafile, JSON.stringify(result.metafile));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

runOneBuild(
  getEsbuildArgs(getFlag("--esbuild_args")),
  getFlag("--user_args", false),
  getFlag("--config_file", false)
);

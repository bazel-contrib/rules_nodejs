const {spawn} = require('child_process');
const {readFileSync} = require('fs');

function getFlag(flag, required = true) {
  const argvFlag = process.argv.find(arg => arg.startsWith(`${flag}=`));
  if (required && !argvFlag) {
    console.error(`Expected flag '${flag}' passed to launcher, but not found`);
    process.exit(1);
  }

  return argvFlag.split('=')[1];
}

const esbuild = getFlag('--esbuild');
const cwd = getFlag('--cwd');
const params_file_path = getFlag('--esbuild_flags');

let flags = [];
try {
  flags = readFileSync(params_file_path, {encoding: 'utf8'}).trim().replace(/'/gm, '').split('\n');
} catch (e) {
  console.error('Error while reading esbuild flags param file', e);
  process.exit(1);
}

spawn(esbuild, flags, {cwd, detached: true, stdio: 'inherit'});

const os = require('os');
const child_process = require('child_process');

const nodejsBinaryExt = os.platform() === 'win32' ? '.bat' : '.sh';
const mainBin = require.resolve(`./main_bin${nodejsBinaryExt}`);

function runBinary(binary) {
  console.log(`Running ${binary} in ${process.env.TEST_TMPDIR}`);
  const spawnedProcess = child_process.spawnSync(binary, [], {
    stdio: 'inherit',
    cwd: process.env.TEST_TMPDIR,
    env: {...process.env},
  });

  if (spawnedProcess.status !== 0) {
    console.error(`Command ${binary} failed. See error above.`);
    process.exit(1);
  }
};

runBinary(mainBin);
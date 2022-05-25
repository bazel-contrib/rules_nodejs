const spawnSync = require('child_process').spawnSync

const res = spawnSync('npm', ['--version']);
if (res.status) {
  process.stderr.write(res.stderr);
  throw new Error('failed. to execute child process. code ' + res.status);
}
console.log(JSON.stringify({version: res.stdout + ''}));
import {spawnSync} from 'child_process';

if (!process.argv[2]) {
  const res = spawnSync('node', [__filename, Date.now() + '']);
  if (res.status) {
    process.stderr.write(res.stderr);
    throw new Error('failed. to execute child process. code ' + res.status);
  }
  console.log(JSON.stringify({
    main: [
      process.execPath,
      process.execArgv,
      process.argv,
      process.env.PATH,
    ],
    result: JSON.parse(res.stdout + ''),
  }));
} else {
  console.log(JSON.stringify([
    process.execPath,
    process.execArgv,
    process.argv,
    process.env.PATH,
  ]));
}

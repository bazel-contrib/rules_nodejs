import {execSync} from 'child_process';

const data = [
  process.execPath,
  process.execArgv,
  process.argv,
  process.env.PATH,
];

if (!process.argv[2]) {
  console.log(JSON.stringify({
    main: data,
    result: JSON.parse(execSync('node ' + __filename + ' ' + Date.now()) + ''),
  }));
} else {
  console.log(JSON.stringify(data));
}

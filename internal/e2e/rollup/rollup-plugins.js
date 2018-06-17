// console.log(process.cwd());
// var spawn = require('child_process').spawnSync;
// var out = spawn("ls", ["-l"]);
// var out2 = spawn("ls", ["-l", "internal"]);
// var out3 = spawn("ls", ["-l", "internal/e2e"]);
// var out4 = spawn("ls", ["-l", "internal/e2e/rollup"]);
// var out4 = spawn("ls", ["-l", "internal/e2e/rollup/node_modules"]);
// var out4 = spawn("ls", ["-l", "internal/e2e/rollup/node_modules/rollup-plugin-json/"]);
// var out4 = spawn("ls", ["-l", "internal/e2e/rollup/node_modules/rollup-plugin-json/dist"]);
// console.log('---');
// console.log(out.stdout.toString('utf8'));
// console.log('-------');
// console.log(out2.stdout.toString('utf8'));
// console.log('-------');
// console.log(out3.stdout.toString('utf8'));
// console.log('-------!!!!!!!!');
// console.log(out4.stdout.toString('utf8'));

const json = require('rollup-plugin-json');
// const json2 = require('rollup-plugin-json');


console.log(json);
// console.log(json2);

module.exports = [
  json({
    preferConst: true,
    exclude: ['node_modules/**'],
    indent: '  ',
  }),
];

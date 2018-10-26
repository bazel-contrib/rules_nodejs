// A simple wrapper around babel-core due to https://github.com/babel/babel/issues/8193

const {writeFile, mkdir} = require('fs');
const path = require('path');

const babel = require('@babel/core');
const program = require('commander');

program.version('1.0.0')
    .usage('[options] <files...>')
    .option('-o, --out-dir <value>', 'Output directory for created files')
    .option('-c, --config-file <value>', 'babel.rc.js config file')
    .parse(process.argv);

const outDir = program['outDir'] || '';

let babelConfig = {};
if (program['configFile']) {
  // Note: We do not want to use bazel resolve mechanisms, so use path resolve to get the absolute
  // path and load that.
  babelConfig = require(path.resolve(program['configFile']));
}

for (let i = 0; i < program.args.length; i += 2) {
  const input = program.args[i];
  const output = path.join(outDir, program.args[i+1]);

  babel.transformFile(input, babelConfig, function(err, result) {
    if (err) {
      return console.error(err);
    }
    // Ensure directory exists
    mkdir(path.dirname(output), { recursive: true }, (err) => {
      if (err) {
        return console.error(err);
      }
      return writeFile(output, result.code, (err) => {
        if (err) {
          return console.error(err);
        }
      });
    });
  });
}

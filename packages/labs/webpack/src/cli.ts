/// <reference lib="es2015"/>
import webpack = require('webpack');
import * as fs from 'fs';
import * as path from 'path';

function unquoteArgs(s: string) {
  return s.replace(/^'(.*)'$/, '$1');
}

function configure(args: string[]): webpack.Configuration {
  const [bundleOut, sourcemapOut, entryPoint] = args;
  return {
    mode: 'production',
    entry: path.resolve(entryPoint),
    output: {
      path: path.dirname(path.resolve(bundleOut)),
      filename: path.basename(bundleOut),
      sourceMapFilename: path.basename(sourcemapOut),
    },
    devtool: 'cheap-source-map',
  };
}

function main(config: webpack.Configuration): 0|1 {
  const compiler = webpack(config);
  let exitCode: 0|1 = 0;
  compiler.run((err, stats) => {
    if (err) {
      console.error('Webpack failed, run with --subcommands for details');
      console.error(err.stack || err);
      if ((err as any).details) {
        console.error((err as any).details);
      }
      exitCode = 1;
    }
    if (stats.hasErrors()) {
      console.error('Errors in Webpack inputs', stats.toJson());
      exitCode = 1;
    }
  });
  return exitCode;
}

if (require.main === module) {
  // Avoid limitations of length of argv by using a flagfile
  // This also makes it easier to debug - you can just look
  // at this flagfile to see what args were passed to webpack
  const args = fs.readFileSync(process.argv[2], {encoding: 'utf-8'}).split('\n').map(unquoteArgs);
  process.exitCode = main(configure(args));
}

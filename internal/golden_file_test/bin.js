const fs = require('fs');
const path = require('path');

function main(args) {
  const [mode, golden_no_debug, golden_debug, actual] = args;
  const debug = !!process.env['DEBUG'];
  const golden = debug ? golden_debug : golden_no_debug;
  const actualContents = fs.readFileSync(require.resolve(actual), 'utf-8').replace(/\r\n/g, '\n');
  const goldenContents = fs.readFileSync(require.resolve(golden), 'utf-8').replace(/\r\n/g, '\n');

  if (actualContents !== goldenContents) {
    if (mode === '--out') {
      // Write to golden file
      fs.writeFileSync(require.resolve(golden), actualContents);
      console.error(`Replaced ${path.join(process.cwd(), golden)}`);
    } else if (mode === '--verify') {
      const unidiff = require('unidiff');
      // Generated does not match golden
      const diff = unidiff.diffLines(goldenContents, actualContents);
      let prettyDiff = unidiff.formatLines(diff, {aname: golden, bname: actual});
      if (prettyDiff.length > 5000) {
        prettyDiff = prettyDiff.substr(0, 5000) + '/n...elided...';
      }
      throw new Error(`Actual output doesn't match golden file:
      
${prettyDiff}
      
Update the golden file:

            bazel run ${debug ? '--define=DEBUG=1 ' : ''}${
          process.env['BAZEL_TARGET'].replace(/_bin$/, '')}.accept
`);
    } else {
      throw new Error('unknown mode', mode);
    }
  }
}

if (require.main === module) {
  main(process.argv.slice(2));
}

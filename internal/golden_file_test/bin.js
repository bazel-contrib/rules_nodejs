const fs = require('fs');
const path = require('path');
const unidiff = require('unidiff');

function main(args) {
  const [mode, golden, actual] = args;
  const actualContents = fs.readFileSync(require.resolve(actual), 'utf-8').replace(/\r\n/g, '\n');
  const goldenContents = fs.readFileSync(require.resolve(golden), 'utf-8').replace(/\r\n/g, '\n');

  if (actualContents !== goldenContents) {
    if (mode === '--out') {
      // Write to golden file
      fs.writeFileSync(require.resolve(golden), actualContents);
      console.error(`Replaced ${path.join(process.cwd(), golden)}`);
    } else if (mode === '--verify') {
      // Generated does not match golden
      const diff = unidiff.diffLines(goldenContents, actualContents);
      const prettyDiff = unidiff.formatLines(diff, {aname: golden, bname: actual});
      throw new Error(`Actual output doesn't match golden file:
      
${prettyDiff}
      
Update the golden file:

            bazel run ${process.env['BAZEL_TARGET'].replace(/_bin$/, '')}.accept
`);
    } else {
      throw new Error('unknown mode', mode);
    }
  }
}

if (require.main === module) {
  main(process.argv.slice(2));
}

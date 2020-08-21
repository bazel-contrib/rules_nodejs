const fs = require('fs');
const path = require('path');
// We run rollup so this import will be vendored into the resulting bundle
import * as unidiff from 'unidiff/unidiff';
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

function findGoldenInGenerated(golden, actual) {
  const goldenLines = golden.split(/[\r\n]+/g).map(l => l.trim());
  const actualLines = actual.split(/[\r\n]+/g).map(l => l.trim());
  // Note: this is not the fastest subsequence algorithm.
  nextActualLine: for (let i = 0; i < actualLines.length; i++) {
    for (let j = 0; j < goldenLines.length; j++) {
      if (actualLines[i + j] !== goldenLines[j]) {
        continue nextActualLine;
      }
    }
    // A match!
    return true;
  }
  // No match.
  return false;
}

function main(args) {
  const [mode, golden_no_debug, golden_debug, actual] = args;
  const actualPath = runfiles.resolveWorkspaceRelative(actual);
  const debugBuild = /\/bazel-out\/[^/\s]*-dbg\//.test(actualPath);
  const golden = debugBuild ? golden_debug : golden_no_debug;
  const actualContents = fs.readFileSync(actualPath, 'utf-8').replace(/\r\n/g, '\n');
  const goldenContents =
      fs.readFileSync(runfiles.resolveWorkspaceRelative(golden), 'utf-8').replace(/\r\n/g, '\n');

  if (actualContents === goldenContents) {
    return 0;
  }
  if (mode === '--out') {
    // Write to golden file
    fs.writeFileSync(runfiles.resolveWorkspaceRelative(golden), actualContents);
    console.error(`Replaced ${path.join(process.cwd(), golden)}`);
    return 0;
  }
  if (mode === '--verify') {
    // Compare the generated file to the golden file.
    const diff = unidiff.diffLines(goldenContents, actualContents);
    let prettyDiff =
        unidiff.formatLines(diff, {aname: `[workspace]/${golden}`, bname: `[bazel-out]/${actual}`});
    if (prettyDiff.length > 5000) {
      prettyDiff = prettyDiff.substr(0, 5000) + '/n...elided...';
    }
    console.error(`Generated output doesn't match:

${prettyDiff}

If the bazel-out content is correct, you can update the workspace file by running:

          bazel run ${debugBuild ? '--compilation_mode=dbg ' : ''}${
        process.env['TEST_TARGET'].replace(/_bin$/, '')}.update
`);
    return 1;
  }
  if (mode === '--substring') {
    // Verify that the golden file is contained _somewhere_ in the generated
    // file.
    const diff = findGoldenInGenerated(goldenContents, actualContents);
    if (diff) {
      console.error(`Unable to find golden contents inside of the the generated file:
        
${goldenContents}
`)
      return 1;
    }
    return 0;
  }
  throw new Error('unknown mode', mode);
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

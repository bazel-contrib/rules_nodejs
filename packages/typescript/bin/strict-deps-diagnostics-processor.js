const {readFileSync, writeFileSync} = require('fs');
const diagnosticsOutPath = process.argv[2];
const exitcodeOutPath = process.argv[3];
const processedDiagnosticsOutPath = process.argv[4];
const label = process.argv[5];

if (!diagnosticsOutPath && !exitcodeOutPath && !processedDiagnosticsOutPath) {
  throw new Error(`Expected path to tsc diagnostics output and exitcode`);
}

let tsDiagnostics = readFileSync(diagnosticsOutPath, {encoding: 'utf8'});
const exitcode = readFileSync(exitcodeOutPath, {encoding: 'utf8'});

// find all the TS2307 diagnostics and pull out the module specifier from the message
const matches =
  tsDiagnostics.matchAll(new RegExp(`TS2307:.*?Cannot find module '(?<module>.*?)'\.`, 'gm'));

if (matches) {
  Array.from(matches).reverse().forEach(match => {
    const moduleSpecifier = match.groups.module;
    const diagOffset = match.index + match[0].length;
    const depsMessage = ` Ensure that the dependency for '${
      moduleSpecifier}' is added to ${label} deps attribute.`;
    tsDiagnostics =
      tsDiagnostics.slice(0, diagOffset) + depsMessage + tsDiagnostics.slice(diagOffset);
  });
}

writeFileSync(processedDiagnosticsOutPath, tsDiagnostics, {encoding: 'utf8'});
process.stderr.write(tsDiagnostics);

process.exit(Number(exitcode));

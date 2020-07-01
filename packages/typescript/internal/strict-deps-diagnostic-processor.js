const {readFileSync} = require('fs');
const diagnosticsOutPath = process.argv[2];
const exitcodeOutPath = process.argv[3];

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
        moduleSpecifier}' is added to the targets deps attribute.`;
    tsDiagnostics =
        tsDiagnostics.slice(0, diagOffset) + depsMessage + tsDiagnostics.slice(diagOffset);
  });
}

process.stderr.write(tsDiagnostics);

process.exit(parseInt(exitcode, 10));

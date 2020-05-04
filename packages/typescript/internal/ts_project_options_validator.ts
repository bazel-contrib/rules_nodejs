import * as ts from 'typescript';

const diagnosticsHost: ts.FormatDiagnosticsHost = {
  getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
  getNewLine: () => ts.sys.newLine,
  // Print filenames including their relativeRoot, so they can be located on
  // disk
  getCanonicalFileName: (f: string) => f
};

function main([tsconfigPath, output, target, attrsStr]: string[]): 0|1 {
  // The Bazel ts_project attributes were json-encoded
  // (on Windows the quotes seem to be quoted wrong, so replace backslash with quotes :shrug:)
  const attrs = JSON.parse(attrsStr.replace(/\\/g, '"'));

  // Parse your typescript settings from the tsconfig
  // This will understand the "extends" semantics.
  const {config, error} = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (error) throw new Error(tsconfigPath + ':' + ts.formatDiagnostic(error, diagnosticsHost));
  const {errors, options} =
      ts.parseJsonConfigFileContent(config, ts.sys, require('path').dirname(tsconfigPath));
  // We don't pass the srcs to this action, so it can't know if the program has the right sources.
  // Diagnostics look like
  // error TS18002: The 'files' list in config file 'tsconfig.json' is empty.
  // error TS18003: No inputs were found in config file 'tsconfig.json'. Specified 'include'...
  const fatalErrors = errors.filter(e => e.code !== 18002 && e.code != 18003);
  if (fatalErrors.length > 0)
    throw new Error(tsconfigPath + ':' + ts.formatDiagnostics(fatalErrors, diagnosticsHost));

  const failures: string[] = [];
  const buildozerCmds: string[] = [];
  function check(option: string, attr?: string) {
    attr = attr || option;
    // treat compilerOptions undefined as false
    const optionVal = options[option] === undefined ? false : options[option];
    if (optionVal !== attrs[attr]) {
      failures.push(
          `attribute ${attr}=${attrs[attr]} does not match compilerOptions.${option}=${optionVal}`);
      buildozerCmds.push(`set ${attr} ${optionVal ? 'True' : 'False'}`);
    }
  }

  check('declarationMap', 'declaration_map');
  check('emitDeclarationOnly', 'emit_declaration_only');
  check('sourceMap', 'source_map');
  check('composite');
  check('declaration');
  check('incremental');

  if (failures.length > 0) {
    console.error(`ERROR: ts_project rule ${
        target} was configured with attributes that don't match the tsconfig`);
    failures.forEach(f => console.error(' - ' + f));
    console.error('You can automatically fix this by running:');
    console.error(
        `    npx @bazel/buildozer ${buildozerCmds.map(c => `'${c}'`).join(' ')} ${target}`);
    console.error('Or to suppress this error, run:');
    console.error(`    npx @bazel/buildozer 'set validate False' ${target}`);
    return 1;
  }

  // We have to write an output so that Bazel needs to execute this action.
  // Make the output change whenever the attributes changed.
  require('fs').writeFileSync(
      output, `
// ${process.argv[1]} checked attributes for ${target}
// composite:             ${attrs.composite}
// declaration:           ${attrs.declaration}
// declaration_map:       ${attrs.declaration_map}
// incremental:           ${attrs.incremental}
// source_map:            ${attrs.source_map}
// emit_declaration_only: ${attrs.emit_declaration_only}
`,
      'utf-8');
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(process.argv[1], e);
  }
}
/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const ts = require("typescript");
const diagnosticsHost = {
    getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
    getNewLine: () => ts.sys.newLine,
    getCanonicalFileName: (f) => f
};
function main([tsconfigPath, output, target, attrsStr]) {
    const attrs = JSON.parse(attrsStr.replace(/\\/g, '"'));
    const { config, error } = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (error)
        throw new Error(tsconfigPath + ':' + ts.formatDiagnostic(error, diagnosticsHost));
    const { errors, options } = ts.parseJsonConfigFileContent(config, ts.sys, require('path').dirname(tsconfigPath));
    const fatalErrors = errors.filter(e => e.code !== 18002 && e.code != 18003);
    if (fatalErrors.length > 0)
        throw new Error(tsconfigPath + ':' + ts.formatDiagnostics(fatalErrors, diagnosticsHost));
    const failures = [];
    const buildozerCmds = [];
    function getTsOption(option) {
        if (typeof (options[option]) === 'string') {
            const packageDir = target.substr(2, target.indexOf(':') - 2);
            return (0, path_1.relative)(packageDir, options[option]);
        }
        return options[option];
    }
    function check(option, attr) {
        attr = attr || option;
        const optionVal = getTsOption(option);
        const match = optionVal === attrs[attr] ||
            (optionVal === undefined && (attrs[attr] === false || attrs[attr] === ''));
        if (!match) {
            failures.push(`attribute ${attr}=${attrs[attr]} does not match compilerOptions.${option}=${optionVal}`);
            if (typeof (optionVal) === 'boolean') {
                buildozerCmds.push(`set ${attr} ${optionVal ? 'True' : 'False'}`);
            }
            else if (typeof (optionVal) === 'string') {
                buildozerCmds.push(`set ${attr} \"${optionVal}\"`);
            }
            else if (optionVal === undefined) {
            }
            else {
                throw new Error(`cannot check option ${option} of type ${typeof (option)}`);
            }
        }
    }
    const jsxEmit = {
        [ts.JsxEmit.None]: 'none',
        [ts.JsxEmit.Preserve]: 'preserve',
        [ts.JsxEmit.React]: 'react',
        [ts.JsxEmit.ReactNative]: 'react-native',
        [ts.JsxEmit.ReactJSX]: 'react-jsx',
        [ts.JsxEmit.ReactJSXDev]: 'react-jsx-dev',
    };
    function check_preserve_jsx() {
        const attr = 'preserve_jsx';
        const jsxVal = options['jsx'];
        if ((jsxVal === ts.JsxEmit.Preserve) !== Boolean(attrs[attr])) {
            failures.push(`attribute ${attr}=${attrs[attr]} does not match compilerOptions.jsx=${jsxEmit[jsxVal]}`);
            buildozerCmds.push(`set ${attr} ${jsxVal === ts.JsxEmit.Preserve ? 'True' : 'False'}`);
        }
    }
    if (options.noEmit) {
        console.error(`ERROR: ts_project rule ${target} cannot be built because the 'noEmit' option is specified in the tsconfig.`);
        console.error('This is not compatible with ts_project, which always produces outputs.');
        console.error('- If you mean to only typecheck the code, use the tsc_test rule instead.');
        console.error('  (See the Alternatives section in the documentation.)');
        console.error('- Otherwise, remove the noEmit option from tsconfig and try again.');
        return 1;
    }
    check('allowJs', 'allow_js');
    check('declarationMap', 'declaration_map');
    check('emitDeclarationOnly', 'emit_declaration_only');
    check('resolveJsonModule', 'resolve_json_module');
    check('sourceMap', 'source_map');
    check('composite');
    check('declaration');
    check('incremental');
    check('tsBuildInfoFile', 'ts_build_info_file');
    check_preserve_jsx();
    if (failures.length > 0) {
        console.error(`ERROR: ts_project rule ${target} was configured with attributes that don't match the tsconfig`);
        failures.forEach(f => console.error(' - ' + f));
        console.error('You can automatically fix this by running:');
        console.error(`    npx @bazel/buildozer ${buildozerCmds.map(c => `'${c}'`).join(' ')} ${target}`);
        return 1;
    }
    require('fs').writeFileSync(output, `
// ${process.argv[1]} checked attributes for ${target}
// allow_js:              ${attrs.allow_js}
// composite:             ${attrs.composite}
// declaration:           ${attrs.declaration}
// declaration_map:       ${attrs.declaration_map}
// incremental:           ${attrs.incremental}
// source_map:            ${attrs.source_map}
// emit_declaration_only: ${attrs.emit_declaration_only}
// ts_build_info_file:    ${attrs.ts_build_info_file}
// preserve_jsx:          ${attrs.preserve_jsx}
`, 'utf-8');
    return 0;
}
if (require.main === module) {
    try {
        process.exitCode = main(process.argv.slice(2));
        if (process.exitCode != 0) {
            console.error('Or to suppress this error, run:');
            console.error(`    npx @bazel/buildozer 'set validate False' ${process.argv[4]}`);
        }
    }
    catch (e) {
        console.error(process.argv[1], e);
    }
}

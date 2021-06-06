/**
 * Converts a list of generated protobuf-js files from commonjs modules into named AMD modules.
 *
 * Initial implementation derived from
 * https://github.com/Dig-Doug/rules_typescript_proto/blob/master/src/change_import_style.ts
 *
 * Arguments:
 *   --workspace_name
 *   --input_base_path
 *   --output_module_name
 *   --input_file_path
 *   --output_file_path
 */
const minimist = require('minimist');
const fs = require('fs');
const path = require('path');

function main() {
  const args = minimist(process.argv.slice(2));
  const input_dts_path = args.input_file_path.replace(/\.js$/, '.d.ts');
  const output_dts_path = args.output_umd_path.replace(/\.js$/, '.d.ts');

  /**
   * Proto files with RPC service definitions will produce an extra file. During a bazel aspect we
   * have to declare our outputs without knowing the contents of the proto file so we generate an
   * empty stub for files without service definitions.
   */
  if (args.input_file_path.endsWith('_grpc_web_pb.js') &&
      !fs.existsSync(args.input_file_path)) {
    fs.writeFileSync(args.output_umd_path, '', 'utf8');
    fs.writeFileSync(output_dts_path, '', 'utf8');
    fs.writeFileSync(args.output_es6_path, '', 'utf8');
    return;
  }

  if (input_dts_path != output_dts_path) {
    fs.copyFileSync(input_dts_path, output_dts_path);
  }

  const initialContents = fs.readFileSync(args.input_file_path, 'utf8');

  const umdContents = convertToUmd(args, initialContents);
  fs.writeFileSync(args.output_umd_path, umdContents, 'utf8');

  const commonJsContents = convertToESM(args, initialContents);
  fs.writeFileSync(args.output_es6_path, commonJsContents, 'utf8');
}

function replaceRecursiveFilePaths(args) {
  return (contents) => {
    return contents.replace(/(\.\.\/)+/g, `${args.workspace_name}/`);
  };
}

function removeJsExtensionsFromRequires(contents) {
  return contents.replace(/(require\(.*).js/g, (_, captureGroup) => {
    return captureGroup;
  });
}

function convertToUmd(args, initialContents) {
  const wrapInAMDModule = (contents) => {
    return `// GENERATED CODE DO NOT EDIT
    (function (factory) {
      if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
      }
      else if (typeof define === "function" && define.amd) {
        define("${args.input_base_path}/${args.output_module_name}",  factory);
      }
    })(function (require, exports) {
      ${contents.replace(/module.exports =/g, 'return')}
    });
`;
  };

  const transformations = [
    wrapInAMDModule,
    replaceRecursiveFilePaths(args),
    removeJsExtensionsFromRequires,
  ];
  return transformations.reduce((currentContents, transform) => {
    return transform(currentContents);
  }, initialContents);
}

// Converts the CommonJS format from protoc to the ECMAScript Module format.
// Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
function convertToESM(args, initialContents) {
  const replaceGoogExtendWithExports = (contents) => {
    const symbols = [];
    let exportVariable;
    let packageName;

    contents = contents.replace(/goog\.object\.extend\(exports, ([\w\.]+)\);/g, (_, p) => {
      packageName = p;
      exportVariable = contents.includes('const grpc = {}') ? 'exportVariable' : packageName;

      const exportSymbols = /goog\.exportSymbol\('([\w\.]+)',.*\);/g;

      let match;
      while ((match = exportSymbols.exec(initialContents))) {
        // We want to ignore embedded export targets, IE:
        // `DeliveryPerson.DataCase`.
        const exportTarget = match[1].substr(packageName.length + 1);
        if (!exportTarget.includes('.')) {
          symbols.push(exportTarget);
        }
      }

      return `export const { ${symbols.join(', ')} } = ${exportVariable}`;
    });

    return symbols.reduce(
        (contents, symbol) => {return contents.replace(
            new RegExp(`${packageName}\\.${symbol}`, 'g'), `${exportVariable}.${symbol}`)},
        contents)
  };

  const replaceCMDefaultExportWithExports = (contents) => {
    const symbols = [];
    let exportVariable;
    let packageName;

    contents = contents.replace(/module.exports = ([\w\.]+)\;/g, (_, p) => {
      packageName = p;
      exportVariable = contents.includes('const grpc = {}') ? 'exportVariable' : packageName;

      const exportSymbols = new RegExp(`${packageName.replace('.', '\\.')}\.([\\w\\.]+) =`, 'g');

      let match;
      while ((match = exportSymbols.exec(initialContents))) {
        // We want to ignore embedded export targets, IE:
        // `DeliveryPerson.DataCase`.
        const exportTarget = match[1];
        if (!exportTarget.includes('.')) {
          symbols.push(exportTarget);
        }
      }

      return `export const { ${symbols.join(', ')} } = ${exportVariable};`;
    });

    return symbols.reduce(
        (contents, symbol) => {return contents.replace(
            new RegExp(`${packageName}\\.${symbol}`, 'g'), `${exportVariable}.${symbol}`)},
        contents)
  };

  const replaceRequiresWithImports = (contents) => {
    return contents
        .replace(
            /(?:var|const|let) ([\w\d_]+) = require\(['"]([\.\\]*[\w\d@/_-]+)['"]\)/g,
            (_, variable, importPath) => {
              if (importPath.startsWith(args.workspace_name)) {
                importPath = `./${path.relative(args.input_base_path, importPath)}`;
              }
              return `import * as ${variable} from '${importPath}';`
            })
        .replace(
            /([\.\w\d_]+) = require\(['"]([\.\w\d@/_-]+)['"]\)/g, (_, variable, importPath) => {
              if (importPath.startsWith(args.workspace_name)) {
                importPath = `./${path.relative(args.input_base_path, importPath)}`;
              }

              const normalizedVariable = variable.replace(/\./g, '_');
              return `import * as ${normalizedVariable} from '${importPath}';\n${variable} = {...${
                  normalizedVariable}}`;
            });
  };

  const replaceRequiresWithSubpackageImports =
      (contents) => {
        return contents.replace(
            /(?:var|const|let) ([\w\d_]+) = require\(['"]([\w\d@/_-]+)['"]\)\.([\w\d_]+);/g,
            (_, variable, importPath) => {
              if (importPath.startsWith(args.workspace_name)) {
                importPath = `./${path.relative(args.input_base_path, importPath)}`;
              }
              return `import * as ${variable} from '${importPath}';`
            });
      }

  const replaceCJSExportsWithECMAExports = (contents) => {
    return contents.replace(/exports\.([\w\d_]+) = .*;/g, 'export { $1 };');
  };

  const transformations = [
    replaceRecursiveFilePaths(args),
    removeJsExtensionsFromRequires,
    replaceGoogExtendWithExports,
    replaceRequiresWithImports,
    replaceRequiresWithSubpackageImports,
    replaceCMDefaultExportWithExports,
    replaceCJSExportsWithECMAExports,
  ];

  return `const exportVariable = {}\n` + transformations.reduce((currentContents, transform) => {
    return transform(currentContents);
  }, initialContents);
}

main();

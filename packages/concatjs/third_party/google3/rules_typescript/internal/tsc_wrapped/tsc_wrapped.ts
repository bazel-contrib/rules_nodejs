import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import {parseTsconfig} from './tsconfig';

export function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) throw new Error('Not enough arguments');
  const result = runOneBuild(args);
  process.exit(result ? 0 : 1);
}

class CompilerHost implements ts.CompilerHost {

  /**
   * Lookup table to answer file stat's without looking on disk.
   */
  private knownFiles = new Set<string>();

  /**
   * rootDirs relative to the rootDir, eg "bazel-out/local-fastbuild/bin"
   */
  private relativeRoots: string[];

  constructor(public inputFiles: string[],
      readonly options: ts.CompilerOptions, private delegate: ts.CompilerHost) {
    // Try longest include directories first.
    this.options.rootDirs.sort((a, b) => b.length - a.length);
    this.relativeRoots =
        this.options.rootDirs.map(r => path.relative(this.options.rootDir, r));
    inputFiles.forEach((f) => {
      this.knownFiles.add(f);
    });
  }

  /**
   * Workaround https://github.com/Microsoft/TypeScript/issues/8245
   * We use the `rootDirs` property both for module resolution,
   * and *also* to flatten the structure of the output directory
   * (as `rootDir` would do for a single root).
   * To do this, look for the pattern outDir/relativeRoots[i]/path/to/file
   * or relativeRoots[i]/path/to/file
   * and replace that with path/to/file
   */
  flattenOutDir(fileName: string): string {
    let result = fileName;

    // outDir/relativeRoots[i]/path/to/file -> relativeRoots[i]/path/to/file
    if (fileName.startsWith(this.options.rootDir)) {
      result = path.relative(this.options.outDir, fileName);
    }

    for (const dir of this.relativeRoots) {
      if (result.startsWith(dir + '/')) {
        // relativeRoots[i]/path/to/file -> path/to/file
        result = path.relative(dir, result);
        // relativeRoots is sorted longest first so we can short-circuit
        // after the first match
        break;
      }
    }
    return result;
  }

  writeFile(
      fileName: string, content: string, writeByteOrderMark: boolean,
      onError?: (message: string) => void,
      sourceFiles?: ts.SourceFile[]): void {
    fileName = this.flattenOutDir(fileName);

    // Prepend the output directory.
    fileName = path.join(this.options.outDir, fileName);

    if (!fs.existsSync(fileName) ||
        fs.readFileSync(fileName, 'utf-8') !== content) {
      this.delegate.writeFile(
          fileName, content, writeByteOrderMark, onError, sourceFiles);
    }
  }

  /**
   * Performance optimization: don't try to stat files we weren't explicitly
   * given as inputs.
   * This also allows us to disable Bazel sandboxing, without accidentally
   * reading .ts inputs when .d.ts inputs are intended.
   */
  fileExists(filePath: string): boolean {
    // Allow moduleResolution=node to behave normally.
    // TODO(alexeagle): make a bazelOptions.node_modules_prefix option in the
    // tsconfig that gives us a specific root where TS can look around the disk.
    if (filePath.indexOf('/node_modules/') >= 0) {
      return this.delegate.fileExists(filePath);
    }
    return this.knownFiles.has(filePath);
  }

  // Delegate everything else to the original compiler host.

  getSourceFile(
      fileName: string, languageVersion: ts.ScriptTarget,
      onError?: (message: string) => void) {
    return this.delegate.getSourceFile(fileName, languageVersion, onError);
  }

  getDefaultLibFileName(options: ts.CompilerOptions): string {
    return this.delegate.getDefaultLibFileName(options);
  }

  getCanonicalFileName(path: string) {
    return this.delegate.getCanonicalFileName(path);
  }

  getCurrentDirectory(): string {
    return this.delegate.getCurrentDirectory();
  }

  useCaseSensitiveFileNames(): boolean {
    return this.delegate.useCaseSensitiveFileNames();
  }

  getNewLine(): string {
    return this.delegate.getNewLine();
  }

  getDirectories(path: string) {
    return this.delegate.getDirectories(path);
  }

  readFile(fileName: string): string {
    return this.delegate.readFile(fileName);
  }

  trace(s: string): void {
    console.error(s);
  }
}

function format(target: string, diagnostics: ts.Diagnostic[]): string {
  const diagnosticsHost: ts.FormatDiagnosticsHost = {
    ...ts.sys,
    getNewLine: () => ts.sys.newLine,
    getCanonicalFileName: (f: string) =>
        ts.sys.useCaseSensitiveFileNames ? f : f.toLowerCase()
  };
  return ts.formatDiagnostics(diagnostics, diagnosticsHost);
}

/**
 * Runs a single build, returning false on failure.  This is potentially called
 * multiple times (once per bazel request) when running as a bazel worker.
 * Any encountered errors are written to stderr.
 */
function runOneBuild(
    args: string[], inputs?: {[path: string]: string}): boolean {
  const tsconfigFile = args[1];
  const [parsed, errors, {target}] = parseTsconfig(tsconfigFile);
  if (errors) {
    console.error(format(target, errors));
    return false;
  }
  const {options, bazelOpts, files} = parsed;
  const compilerHostDelegate =
      ts.createCompilerHost({target: ts.ScriptTarget.ES5});

  const compilerHost = new CompilerHost(files, options, compilerHostDelegate);
  const program = ts.createProgram(files, options, compilerHost);

  function isCompilationTarget(sf: ts.SourceFile): boolean {
    return (bazelOpts.compilationTargetSrc.indexOf(sf.fileName) !== -1);
  }
  const diagnostics: ts.Diagnostic[] = [];
  // These checks mirror ts.getPreEmitDiagnostics, with the important
  // exception that if you call program.getDeclarationDiagnostics() it somehow
  // corrupts the emit.
  diagnostics.push(...program.getOptionsDiagnostics());
  diagnostics.push(...program.getGlobalDiagnostics());
  for (const sf of program.getSourceFiles().filter(isCompilationTarget)) {
    diagnostics.push(...program.getSyntacticDiagnostics(sf));
    diagnostics.push(...program.getSemanticDiagnostics(sf));
  }
  if (diagnostics.length > 0) {
    console.error(format(bazelOpts.target, diagnostics));
    return false;
  }
  for (const sf of program.getSourceFiles().filter(isCompilationTarget)) {
    const emitResult = program.emit(sf);
    diagnostics.push(...emitResult.diagnostics);
  }
  if (diagnostics.length > 0) {
    console.error(format(bazelOpts.target, diagnostics));
    return false;
  }
  return true;
}

if (require.main === module) {
  main();
}

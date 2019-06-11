import * as fs from 'fs';
import * as path from 'path';
const sourceMapResolve = require('source-map-resolve');

const DEBUG = false;

/**
 * Checks if the source map for this file points to it's orignal source file
 */
function main() {
  const workspaceDir = process.env.BUILD_WORKSPACE_DIRECTORY || '';

  const runFileContent = fs.readFileSync(__filename).toString();
  const maps = sourceMapResolve.resolveSourceMapSync(runFileContent, __filename, fs.readFileSync);

  if (maps.map.sources.length !== 1) {
    throw new Error('expected only one source file')
  }
  const sourceMapRelativePath = maps.map.sources[0];
  const sourceMapRoot = maps.map.sourceRoot;
  const fullSourcePath = path.join(sourceMapRoot, sourceMapRelativePath);

  if (DEBUG) {
    console.log(`
    sourceMapRoot           ${sourceMapRoot}
    sourceMapRelativePath   ${sourceMapRelativePath}
    fullSourcePath          ${fullSourcePath}
    workspaceDir            ${workspaceDir}
    `)
  }

  if (path.normalize(workspaceDir + '/') !== path.normalize(sourceMapRoot + '/')) {
    throw new Error(`Expected sourceMapRoot to equal workspace root
    sourceMapRoot: ${sourceMapRoot}
    workspaceRoot: ${workspaceDir}`)
  }
}

main();
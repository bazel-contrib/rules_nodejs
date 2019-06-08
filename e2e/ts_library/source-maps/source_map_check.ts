import * as fs from 'fs';
import * as path from 'path';
const sourceMapResolve = require('source-map-resolve');
// mark 1 1

/**
 * Checks if the source map for this file points to it's orignal source file
 */
function main() {
  const runfileUri = __filename;
  const fileName = path.basename(runfileUri);
  const realSourceFileUri =
      path.join(process.env.BUILD_WORKSPACE_DIRECTORY || '', fileName).replace('.js', '.ts')

  const runFileContent = fs.readFileSync(runfileUri).toString();
  const maps = sourceMapResolve.resolveSourceMapSync(runFileContent, runfileUri, fs.readFileSync);

  if (maps.map.sources.length !== 1) {
    throw new Error('expected only one source file')
  }
  const sourceMapSourceUrl = path.resolve(maps.map.sources[0]);
  assertSourceMapPointsToSource(sourceMapSourceUrl, realSourceFileUri)
}

function assertSourceMapPointsToSource(sourceMapUri: string, targetSourceFileUri: string) {
  if (!sourceMapUri.includes(targetSourceFileUri)) {
    throw new Error(`Expected source map URL to include a path to the workspace. 
    resolvedSourceMapUrl: ${sourceMapUri}
    realSourceFileUrl: ${targetSourceFileUri}`)
  }
}

main();
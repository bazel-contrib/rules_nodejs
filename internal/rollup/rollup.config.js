const rollup = require('rollup');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const fs = require('fs');
const path = require('path');

class NormalizePaths {
  resolveId(importee, importer) {
    // process.cwd() is the execroot and ends up looking something like /.../2c2a834fcea131eff2d962ffe20e1c87/bazel-sandbox/872535243457386053/execroot/<workspace_name>
    // from the path to the es6 output is bazel-out/host/bin/<build_file_path>/rollup.runfiles/<workspace_name>/<build_file_path>/bazel-out/host/bin
    const workspaceName = process.cwd().split('/').pop();

    const firstSegment = importee.split('/')[0]
    const importerDir = importer ? path.dirname(importer) : ""
    const buildFileMatch = importerDir.match(`rollup\\.runfiles\\/${workspaceName}/([\\w\\-. \\/]+)\\/bazel\\-out`)
    const buildFilePath = buildFileMatch ? buildFileMatch[1] : "";

    if (firstSegment === 'bazel-out') {
      // entry point is a relative path from the execroot
      return `${process.cwd()}/${importee}.js`;
    } else if (firstSegment === '.' || firstSegment === '..') {
      // relative import
      return `${importerDir}/${importee}.js`;
    } else if (firstSegment === workspaceName || (buildFilePath && firstSegment === buildFilePath)) {
      // most imports start with the workspace name but some start with the build file path
      // need to get down to the base es6 output path
      const importerSegments = importerDir.split("/")
      while (importerSegments.length) {
        const search = importerSegments.slice(-3);
        if (search.length == 3 &&
          search[0] === 'bazel-out' &&
          search[1] === 'host' &&
          search[2] === 'bin') {
          break;
        }
        importerSegments.pop();
      }
      const basePath = importerSegments.join("/")
      if (firstSegment === workspaceName) {
        // drop the workspace name from the importee
        var importPath = importee.split("/");
        importPath.shift();
        importPath = importPath.join("/")
        return `${basePath}/${importPath}.js`;
      } else {
        return `${basePath}/${importee}.js`;
      }
    }
  }
}

export default {
  output: {format: 'iife'},
  plugins: [
      new NormalizePaths(),
      commonjs(),
      nodeResolve({jsnext: true, module: true}),
    ]
}
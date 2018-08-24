'use strict';

const fs = require('fs');
const lockfile = require('@yarnpkg/lockfile');
const path = require('path');

const DEBUG = console.error;

const generatedHeader = `"""Generated file from yarn_install rule.
See $(bazel info output_base)/external/build_bazel_rules_nodejs/internal/npm_install/generate_build_file.js
"""

# All rules in other repositories can use these targets
package(default_visibility = ["//visibility:public"])

load("@build_bazel_rules_nodejs//:defs.bzl", "nodejs_binary")

`;

const allFilegroup = `
# Re-export the entire node_modules directory in one catch-all rule.
# NB. this has bad performance implications if there are many files.
filegroup(
    name = "node_modules",
    srcs = glob(
        include = ["node_modules/**/*"],
        # Files with spaces in the name are not legal Bazel labels
        exclude = ["node_modules/**/* *"],
    ),
)

# Re-export the entire node_modules directory in one catch-all rule.
# NB. this has bad performance implications if there are many files.
filegroup(
    name = "node_modules_trimmed",
    srcs = glob(
        include = [
          "node_modules/**/*.js",
          "node_modules/**/*.d.ts",
          "node_modules/**/*.json",
        ],
        # Files with spaces in the name are not legal Bazel labels
        exclude = ["node_modules/**/* *"],
    ),
)

filegroup(
    name = "node_modules_none",
    srcs = [],
)
`


if (require.main === module) {
  main();
}

/**
 * Main entrypoint.
 * Write BUILD file.
 */
function main() {
  // Scan the node_modules directory and find all top-level ('foo') or scoped (@bar/baz)
  // modules, i.e. folders which contain a package.json file then parse the package.json
  // files to collect the metadata
  let moduleDirs = [
    ...getModulesIn('node_modules'),
    ...findScopes('node_modules').map(scope => getModulesIn(scope)).reduce((a, b) => a.concat(b), [])
  ]
  let nestedModuleDirs = [];
  moduleDirs.forEach(d => {
    nestedModuleDirs.push(...getModulesIn(path.join(d, 'node_modules')));
    nestedModuleDirs.push(...findScopes(path.join(d, 'node_modules')).map(scope => getModulesIn(scope)).reduce((a, b) => a.concat(b), []));
  });
  moduleDirs.push(...nestedModuleDirs);

  const modules = moduleDirs.map(dir => parseNodeModulePackageJson(dir));

  if (fs.existsSync('yarn.lock')) {
    // Read the yarn.lock file and parse it.
    const yarn = lockfile.parse(fs.readFileSync('yarn.lock', {encoding: 'utf8'}));

    if (yarn.type !== 'success') {
      throw new Error('Lockfile parse failed: ' + JSON.stringify(yarn, null, 2));
    }

    validateYarnLock(yarn, modules);
  }

  modules.forEach(module => flattenDependencies(module, module, modules));

  let buildFile = generatedHeader + allFilegroup;
  modules.forEach(module => buildFile += printNodeModule(module));
  fs.writeFileSync('BUILD.bazel', buildFile);
}

module.exports = {main};

function isPackage(d) {
  return fs.statSync(d).isDirectory() &&
    fs.existsSync(path.join(d, 'package.json')) &&
    fs.statSync(path.join(d, 'package.json')).isFile() &&
    !fs.existsSync(path.join(d, 'WORKSPACE'));
}

function getModulesIn(p) {
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
    return [];
  }
  return fs.readdirSync(p)
    .map(f => path.join(p, f))
    .filter(d => isPackage(d));
}

function findScopes(p) {
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
    return [];
  }
  return fs.readdirSync(p)
    .filter(f => f.startsWith("@"))
    .map(f => path.join(p, f))
    .filter(d => fs.statSync(d).isDirectory());
}

function flattenDependencies(module, dep, modules) {
  if (module._dependencies.indexOf(dep._dir) !== -1) {
    // circular dependency
    return;
  }
  module._dependencies.push(dep._dir);
  const processDeps = function(deps) {
    Object.keys(deps || {})
      .map(d => {
        let matching = modules.filter(m => m._dir == `${dep._rootDir}/node_modules/${d}`);
        if (matching.length) {
          // nested dep
          return matching[0];
        }
        matching = modules.filter(m => m._dir == d);
        if (!matching.length) {
          throw new Error(`Could not find dep ${d} of ${dep._dir}`)
        }
        return matching[0];
      })
      .map(d => flattenDependencies(module, d, modules))
  }
  processDeps(dep.dependencies);
  processDeps(dep.optionalDependencies);
  processDeps(dep.peerDependencies);
}

/**
 */
function validateYarnLock(yarn, modules) {
  // Foreach entry in the lockfile, create an entry object.  We'll
  // supplement/merge this with information from the package.json file
  // in a moment...
  const entries = Object.keys(yarn.object).map(key => makeYarnEntry(key, yarn.object[key]));

  // Iterate all the modules and merge the information from yarn into the module
  modules.forEach(module => {
    if (module._isNested) {
      // nested packages don't always show up in the yarn.lock file
      return;
    }
    const entry = findMatchingYarnEntryByNameAndVersion(entries, module);
    if (!entry) {
      throw new Error(`No matching yarn entry found for ${module._dir}@${module.version}`);
    }
  });
}

/**
 */
function findMatchingYarnEntryByNameAndVersion(entries, module) {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    // The package.json file version (module.version) may contain a 'v' prefix while
    // yarn entry file version (entry.version) will not.
    //
    // In most cases module._leafDir will be the same as module.name (which comes
    // from the package's package.json) but in cases where the package.json entry
    // is "foo": "file:./bar" or "foo": "npm:bar@x.x.x" then module.name will not
    // match the directory in node_modules. In these cases, the yarn.lock name will
    // match the module's node_modules directory name. Thus, we always compare the
    // yarn.lock name to the module's directory name.
    if (entry.name == module._leafDir && (entry.version === module.version || `v${entry.version}` === module.version)) {
      return entry;
    }
  }
}

/**
 * Given an entry from lockfile.parse, do additional processing to
 * assign the name and version.
 */
function makeYarnEntry(key, entry) {
  parseName(key, entry);
  parseResolved(entry);
  return entry;
}


/**
 * Parse a yarn name into something that will be agreeable to bazel.
 */
function parseName(key, entry) {
  entry.id = key;

  // can be 'foo@1.0.0' or something like '@types/foo@1.0.0'
  // or even something like @types/foo@https://git@github.com/pkg#mod.
  // TODO: Regexes would be better here to support more package.json dependency
  // formats: https://docs.npmjs.com/files/package.json#dependencies
  const at = key.indexOf("@", 1);
  entry.name = key.slice(0, at);

  const label = entry.name;
  entry.label = label;
}


/**
 * Parse the yarn 'resolved' entry into its component url and sha1.
 */
function parseResolved(entry) {
  const resolved = entry.resolved;
  if (resolved) {
    const tokens = resolved.split("#");
    entry.url = tokens[0];
    entry.sha1 = tokens[1];
  }
}

/**
 * Reformat/pretty-print a json object as a skylark comment (each line
 * starts with '# ').
 */
function printJson(entry) {
  // Hacky workaround to avoic circular issues when JSONifying
  const deps = entry.deps;
  const referrer = entry.referrer;
  const result = JSON.stringify(entry, null, 2).split('\n').map(line => `# ${line}`);

  entry.deps = deps;
  entry.referrer = referrer;
  return result.join('\n');
}

/**
 * Given a module, print a skylark `node_module` rule.
 */
function printNodeModule(module) {
  const filegroup = `
# Generated target for npm package "${module._dir}"
${printJson(module)}
filegroup(
    name = "${module._dir}",
    srcs = [
        ${module._dependencies
          .map(d => `":${d}__files",`)
          .join('\n        ')}
    ],
    # Probably we should have a node_modules rule that acts like filegroup
    # but also exposes a Provider so we know they are in the deps and can
    # find them.
    # Quicky version for prototyping:
    tags = ["HACKY_MARKER_IS_NODE_MODULE"],
)

filegroup(
    name = "${module._dir}__files",
    srcs = glob(
        include = ["node_modules/${module._dir}/**/*"],
        exclude = [
          # Files with spaces in the name are not legal Bazel labels
          "node_modules/${module._dir}/**/* *",
          # Exclude nested node_modules as these should be handled explicitly
          "node_modules/${module._dir}/node_modules/**/*",
        ],
    ),
    # Probably we should have a node_modules rule that acts like filegroup
    # but also exposes a Provider so we know they are in the deps and can
    # find them.
    # Quicky version for prototyping:
    tags = ["HACKY_MARKER_IS_NODE_MODULE"],
)

`;

  const binaries = [];
  if (module.executables) {
    for (const [name, path] of module.executables.entries()) {
      binaries.push(`# Wire up the \`bin\` entry \`${name}\`
nodejs_binary(
    name = "${module._dir}/${name}",
    entry_point = "${module._dir}/${path}",
    data = [":${module._dir}"],
)

`);
    }
  }

  return filegroup + binaries.join('\n');
}

/**
 * Given the name of a top-level folder in node_modules, parse the
 * package json and return it as an object.
 */
function parseNodeModulePackageJson(name) {
  const module = JSON.parse(fs.readFileSync(`${name}/package.json`));
  module._dir = name.replace('\\', '/').replace(/^node_modules\//, '');

  const dirSegments = module._dir.split('/');
  const nodeModulesIndex = dirSegments.indexOf('node_modules');
  if (nodeModulesIndex !== -1) {
    module._rootDir = dirSegments.slice(0, nodeModulesIndex).join('/');
    module._leafDir = dirSegments.slice(nodeModulesIndex+1).join('/');
    module._isNested = true;
  } else {
    module._rootDir = module._dir;
    module._leafDir = module._dir;
    module._isNested = false;
  }

  module._dependencies = [];

  // Take this opportunity to cleanup the module.bin entries
  // into a new Map called 'executables'
  module.executables = new Map();
  if (Array.isArray(module.bin)) {
    // should not happen, but ignore it if present
  } else if (typeof module.bin === 'string') {
    module.executables.set(name, stripBinPrefix(module.bin));
  } else if (typeof module.bin === 'object') {
    for (let key in module.bin) {
      module.executables.set(key, stripBinPrefix(module.bin[key]));
    }
  }

  return module;
}

/**
 * Given a path, remove './' if it exists.
 */
function stripBinPrefix(path) {
  // Bin paths usually come in 2 flavors: './bin/foo' or 'bin/foo',
  // sometimes other stuff like 'lib/foo'.  Remove prefix './' if it
  // exists.
  if (path.indexOf('./') === 0) {
    path = path.slice(2);
  }
  return path;
}

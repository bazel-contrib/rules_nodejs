'use strict';

const fs = require('fs');
const lockfile = require('@yarnpkg/lockfile');
const path = require('path');

const DEBUG = console.error;

const generatedHeader = `"""Generated file from yarn_install rule.
See $(bazel info output_base)/external/build_bazel_rules_nodejs/internal/npm_install/parse_yarn_lock.js
"""`;


if (require.main === module) {
  main('yarn.lock', fs.writeFileSync);
}

/**
 * Main entrypoint.
 * Given a lockfile, write BUILD files in the appropriate directories under node_modules.
 */
function main(lockfilePath, write) {
  // Read the yarn.lock file and parse it.
  let yarn = lockfile.parse(fs.readFileSync(lockfilePath, {encoding: 'utf8'}));

  if (yarn.type !== 'success') {
    throw new Error('Lockfile parse failed: ' + JSON.stringify(yarn, null, 2));
  }

  // Foreach entry in the lockfile, create an entry object.  We'll
  // supplement/merge this with information from the package.json file
  // in a moment...
  //
  DEBUG('yarn.lock contains packages', Object.keys(yarn.object));

  const entries = Object.keys(yarn.object).map(key => makeYarnEntry(key, yarn.object[key]));

  // Scan the node_modules directory and find all top-level ('foo') or scoped (@bar/baz)
  // modules, i.e. folders which contain a package.json file...
  const getModulesIn = p => fs.readdirSync(p).filter(f => isPackage(p, undefined, f));
  const findScopes = p => fs.readdirSync(p).filter(f => f.startsWith("@") && fs.statSync(path.join(p, f)).isDirectory());
  const getModulesInScope = (p, s) => fs.readdirSync(path.join(p, s)).filter(f => isPackage(p, s, f));

  // ...then parse the package.json files to collect the metadata
  let topLevelModuleDirs = getModulesIn('node_modules');
  let scopeModuleDirs = findScopes('node_modules').map(scope => getModulesInScope('node_modules', scope).map(m => scope+'/'+m)).reduce((a, b) => a.concat(b), []);
  let moduleDirs = topLevelModuleDirs.concat(scopeModuleDirs);
  const modules = moduleDirs.map(dir => parseNodeModulePackageJson(dir));

  // Iterate all the modules and merge the information from yarn into the module
  modules.forEach(module => mergePackageJsonWithYarnEntry(entries, module));

  // Didn't realize that the nodejs module ecosystem can contain
  // circular references, but apparently it can.
  breakCircularDependencies(modules)

  modules.forEach(
      module => write(`node_modules/${module.name}/BUILD.bazel`, printNodeModule(module)));

  write('BUILD.bazel', printNodeModuleAll(modules));

  // Create an executable rule all executable entryies in the modules
  // modules.forEach(module => {
  //   if (module.executables) {
  //     for (const [name, path] of module.executables.entries()) {
  //       printNodeBinary(module, name, path);
  //     }
  //   }
  // });
}

module.exports = {main};

function isPackage(p, s, f) {
  let dir = s ? path.join(p, s, f) : path.join(p, f);
  return fs.statSync(dir).isDirectory() &&
    fs.existsSync(path.join(dir, 'package.json')) &&
    fs.statSync(path.join(dir, 'package.json')).isFile()
}

/**
 * Given a list of yarn entries and a target module, find an exact match by name
 * and version.
 */
function findMatchingYarnEntryByNameAndVersion(entries, module) {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.name === module.name && entry.version === module.version) {
      return entry;
    }
  }
}


/**
 * Given a list of yarn entries and a target module, merge them.
 * Actually, this is pretty simple as the yarn entry is simply
 * attached to the module.
 */
function mergePackageJsonWithYarnEntry(entries, module) {
  const entry = findMatchingYarnEntryByNameAndVersion(entries, module);
  if (!entry) {
    throw new Error("No matching node_module found for " + module.name);
  }

  // Use the bazelified name as the module name
  module.original_name = module.name
  module.name = entry.name
  // Store everything else here
  module.yarn = entry;
}

/**
 * Given a list of modules, build a graph of their dependencies and
 * collapse it according to Tarjan's SCC algorithm.  For any strongly
 * connected components, break out the cluster into it's own module
 * and rewrite the dependency graph to point to the cluster rather
 * than the individual module entries.
 */
function breakCircularDependencies(modules) {

  const byName = new Map();
  modules.forEach(module => byName.set(module.name, module));

  // Make a list of nodes
  const nodes = Array.from(byName.keys());
  // An Array<Array<number>> array for the edges
  const edges = [];
  // And a mapping for backreferences mapped by name
  const backrefs = new Map();

  // Build the adjacencyList
  nodes.forEach((node, index) => {
    const list = [];
    edges[index] = list;
    const entry = byName.get(node);
    // Make a set of deps rather than using the entry.dependencies
    // mapping.
    entry.deps = new Set();

    if (entry.dependencies) {

      Object.keys(entry.dependencies).forEach(name => {

        // Save this in the deps set
        const dependency = byName.get(name);
        entry.deps.add(dependency);

        // Populate the adjacency list
        const depIndex = nodes.indexOf(name);
        list.push(depIndex);

        // Compute referrer backreferences for later use.
        let referrer = dependency.referrer;
        if (!referrer) {
          referrer = dependency.referrer = new Set();
        }
        referrer.add(entry);

      });
    }
  });

  const clusters = stronglyConnectedComponents(edges);

  // Foreach non-trivial cluster in the SCC, create a pseudo-module
  // for the cluster and re-link each entry to point to the cluster
  // rather than the dependency.
  clusters.components.forEach((component, index) => {

    if (component.length > 1) {
      // console.log("SCC: ", component);
      // component.forEach(element => {
      //   console.log(`Component ${index} contains ${nodes[element]} (${element})`);
      // });

      // Create a name for the pseudo-module
      const name = '_scc' + index;
      // The dependencies in this cluster component
      const deps = new Set();
      // The pseudo-module for the cluster
      const pseudo = {
        name: name,
        deps: deps
      };

      // A list of entries in this component
      const list = [];
      // Last entry in the component can be standalone
      for (let i = 0; i < component.length; i++) {
        list.push(byName.get(nodes[component[i]]) );
      }

      // A description for the module
      pseudo.description = "Strongly connected component containing " + list.map(e => e.name).join(", ")

      list.forEach(entry => {
        // Add this to the pseudo-module
        deps.add(entry);

        // Iterate the set of items that link to this entry.  Replace
        // their deps set with the psudo-module rather than the entry
        // itself.
        entry.referrer.forEach(ref => {
          ref.deps.delete(entry);

          // Add an entry to the scc component (unless it is a member
          // of it).
          if (!deps.has(ref)) {
            ref.deps.add(pseudo);
          }
        });

        // Each entry in the cluster must have no connections to other
        // dependencies in the cluster, or on the cluster pseudo-dep
        pseudo.deps.forEach(circ => entry.deps.delete(circ));
        entry.deps.delete(pseudo);
      });

      // Store this new pseudo-module in the modules list
      modules.push(pseudo);
    }

  });

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
 * Given a module, print a skylark `node_module` rule.
 */
function printNodeModule(module) {
  const deps = module.deps;
  return `${generatedHeader}
filegroup(
    name = "${module.name}",
    srcs = glob([
        "**/*.js",
        "**/*.d.ts",
        "**/*.json",
    ]),
    visibility = ["//visibility:public"],
)
`;
  // print(``);
  // printJson(module);
  // print(`node_module(`);
  // print(`    name = "${module.yarn ? module.yarn.label : module.name}",`);

  // // SCC pseudomodule wont have 'yarn' property
  // if (module.yarn) {
  //   const url = module.yarn.url || module.url;
  //   const sha1 = module.yarn.sha1;
  //   const executables = module.executables;

  //   print(`    module_name = "${module.name}",`);
  //   print(`    version = "${module.version}",`);
  //   print(`    package_json = "node_modules/${module.name}/package.json",`);
  //   // Exclude filenames with spaces: Bazel can't cope with them (we just have to hope they
  //   aren't needed later...) print(`    srcs = glob(["node_modules/${module.name}/**/*"], exclude
  //   = [
  // 	"node_modules/${module.name}/package.json",
  // 	"**/* *",
  // ]),`);
  //   if (url) {
  //     print(`    url = "${url}",`);
  //   }
  //   if (sha1) {
  //     print(`    sha1 = "${sha1}",`);
  //   }

  //   if (executables.size > 0) {
  //     print(`    executables = {`);
  //     for (const [name, val] of executables.entries()) {
  //       print(`        "${name}": "${val}",`);
  //     }
  //     print(`    },`);
  //   }
  // }

  // if (deps && deps.size) {
  //   print(`    deps = [`);
  //   deps.forEach(dep => {
  //     print(`        ":${dep.yarn ? dep.yarn.label : dep.name}",`);
  //   });
  //   print(`    ],`);
  // }
  // print(`)`);
}


/**
 * Print a top-level build file that defines the @my_deps// package.
 */
function printNodeModuleAll(modules) {
  const moduleNames = modules.map(m => m.yarn ? m.yarn.label : m.name);
  return `${generatedHeader}

# All rules in other repositories can use these targets
package(default_visibility = ["//visibility:public"])

${
      moduleNames
          .map(m => `
# Alias the top-level ${m} package to the versioned one inside the package.
alias(
    name = "${m}",
    actual = "//node_modules/${m}",
)`).join('\n')}

# Re-export the entire node_modules directory in one catch-all rule.
# NB. this has bad performance implications if there are many files.
filegroup(
    name = "node_modules",
    srcs = [
      ${moduleNames.map(s => `":${s}"`)}
    ],
)
`;
}


/**
 * Given a module and the name of an executable defined in it's 'bin'
 * property, print a skylark `node_binary` rule.
 */
function printNodeBinary(module, key, path) {
  const name = module.name === key ? key : `${module.name}_${key}`;
  print(``);
  print(`nodejs_binary(`);
  print(`    name = "${name}_bin",`);
  print(`    entry_point = ":${module.name}",`);
  print(`    executable = "${key}", # Refers to './${path}' inside the module`);
  print(`)`);
}


/**
 * Given the name of a top-level folder in node_modules, parse the
 * package json and return it as an object.
 */
function parseNodeModulePackageJson(name) {
  const module = JSON.parse(fs.readFileSync(`node_modules/${name}/package.json`));

  // Take this opportunity to cleanup the module.bin entries
  // into a new Map called 'executables'
  const executables = module.executables = new Map();

  if (Array.isArray(module.bin)) {
    // should not happen, but ignore it if present
  } else if (typeof module.bin === 'string') {
    executables.set(name, stripBinPrefix(module.bin));
  } else if (typeof module.bin === 'object') {
    for (let key in module.bin) {
      executables.set(key, stripBinPrefix(module.bin[key]));
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

/**
 * Given an adjacency list, compute Tarjan's SCC.
 *
 * https://github.com/mikolalysenko/strongly-connected-components/blob/master/scc.js
 * Copyright https://github.com/mikolalysenko
 */
function stronglyConnectedComponents(adjList) {
  var numVertices = adjList.length;
  var index = new Array(numVertices)
  var lowValue = new Array(numVertices)
  var active = new Array(numVertices)
  var child = new Array(numVertices)
  var scc = new Array(numVertices)
  var sccLinks = new Array(numVertices)

  //Initialize tables
  for (var i=0; i<numVertices; ++i) {
    index[i] = -1
    lowValue[i] = 0
    active[i] = false
    child[i] = 0
    scc[i] = -1
    sccLinks[i] = []
  }

  // The strongConnect function
  var count = 0
  var components = []
  var sccAdjList = []

  function strongConnect(v) {
    // To avoid running out of stack space, this emulates the recursive behaviour of the normal algorithm, effectively using T as the call stack.
    var S = [v], T = [v]
    index[v] = lowValue[v] = count
    active[v] = true
    count += 1
    while(T.length > 0) {
      v = T[T.length-1]
      var e = adjList[v]
      if (child[v] < e.length) { // If we're not done iterating over the children, first try finishing that.
        for(var i=child[v]; i<e.length; ++i) { // Start where we left off.
          var u = e[i]
          if(index[u] < 0) {
            index[u] = lowValue[u] = count
            active[u] = true
            count += 1
            S.push(u)
            T.push(u)
            break // First recurse, then continue here (with the same child!).
            // There is a slight change to Tarjan's algorithm here.
            // Normally, after having recursed, we set lowValue like we do for an active child (although some variants of the algorithm do it slightly differently).
            // Here, we only do so if the child we recursed on is still active.
            // The reasoning is that if it is no longer active, it must have had a lowValue equal to its own index, which means that it is necessarily higher than our lowValue.
          } else if (active[u]) {
            lowValue[v] = Math.min(lowValue[v], lowValue[u])|0
          }
          if (scc[u] >= 0) {
            // Node v is not yet assigned an scc, but once it is that scc can apparently reach scc[u].
            sccLinks[v].push(scc[u])
          }
        }
        child[v] = i // Remember where we left off.
      } else { // If we're done iterating over the children, check whether we have an scc.
        if(lowValue[v] === index[v]) { // TODO: It /might/ be true that T is always a prefix of S (at this point!!!), and if so, this could be used here.
          var component = []
          var links = [], linkCount = 0
          for(var i=S.length-1; i>=0; --i) {
            var w = S[i]
            active[w] = false
            component.push(w)
            links.push(sccLinks[w])
            linkCount += sccLinks[w].length
            scc[w] = components.length
            if(w === v) {
              S.length = i
              break
            }
          }
          components.push(component)
          var allLinks = new Array(linkCount)
          for(var i=0; i<links.length; i++) {
            for(var j=0; j<links[i].length; j++) {
              allLinks[--linkCount] = links[i][j]
            }
          }
          sccAdjList.push(allLinks)
        }
        T.pop() // Now we're finished exploring this particular node (normally corresponds to the return statement)
      }
    }
  }

  //Run strong connect starting from each vertex
  for(var i=0; i<numVertices; ++i) {
    if(index[i] < 0) {
      strongConnect(i)
    }
  }

  // Compact sccAdjList
  var newE
  for(var i=0; i<sccAdjList.length; i++) {
    var e = sccAdjList[i]
    if (e.length === 0) continue
    e.sort(function (a,b) { return a-b; })
    newE = [e[0]]
    for(var j=1; j<e.length; j++) {
      if (e[j] !== e[j-1]) {
        newE.push(e[j])
      }
    }
    sccAdjList[i] = newE
  }

  return {components: components, adjacencyList: sccAdjList}
}

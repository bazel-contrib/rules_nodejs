/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */'use strict';
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
function log_verbose(...m) {
    if (!!process.env['VERBOSE_LOGS'])
        console.error('[generate_build_file.ts]', ...m);
}
const args = process.argv.slice(2);
const WORKSPACE = args[0];
const RULE_TYPE = args[1];
const PKG_JSON_FILE_PATH = args[2];
const LOCK_FILE_PATH = args[3];
const STRICT_VISIBILITY = ((_a = args[4]) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'true';
const INCLUDED_FILES = args[5] ? args[5].split(',') : [];
const BAZEL_VERSION = args[6];
const PUBLIC_VISIBILITY = '//visibility:public';
const LIMITED_VISIBILITY = `@${WORKSPACE}//:__subpackages__`;
function generateBuildFileHeader(visibility = PUBLIC_VISIBILITY) {
    return `# Generated file from ${RULE_TYPE} rule.
# See rules_nodejs/internal/npm_install/generate_build_file.ts

package(default_visibility = ["${visibility}"])

`;
}
if (require.main === module) {
    main();
}
function mkdirp(p) {
    if (!fs.existsSync(p)) {
        mkdirp(path.dirname(p));
        fs.mkdirSync(p);
    }
}
function writeFileSync(p, content) {
    mkdirp(path.dirname(p));
    fs.writeFileSync(p, content);
}
function createFileSymlinkSync(target, p) {
    mkdirp(path.dirname(p));
    fs.symlinkSync(target, p, 'file');
}
function main() {
    const deps = getDirectDependencySet(PKG_JSON_FILE_PATH);
    const pkgs = findPackages('node_modules', deps);
    flattenDependencies(pkgs);
    generateBazelWorkspaces(pkgs);
    generateBuildFiles(pkgs);
    writeFileSync('.bazelignore', 'node_modules');
}
exports.main = main;
function generateBuildFiles(pkgs) {
    generateRootBuildFile(pkgs.filter(pkg => !pkg._isNested));
    pkgs.filter(pkg => !pkg._isNested).forEach(pkg => generatePackageBuildFiles(pkg));
    findScopes().forEach(scope => generateScopeBuildFiles(scope, pkgs));
}
function flattenDependencies(pkgs) {
    const pkgsMap = new Map();
    pkgs.forEach(pkg => pkgsMap.set(pkg._dir, pkg));
    pkgs.forEach(pkg => flattenPkgDependencies(pkg, pkg, pkgsMap));
}
function generateRootBuildFile(pkgs) {
    let pkgFilesStarlark = '';
    if (pkgs.length) {
        const list = pkgs.map(pkg => `"//${pkg._dir}:${pkg._name}__files",
        "//${pkg._dir}:${pkg._name}__nested_node_modules",`)
            .join('\n        ');
        pkgFilesStarlark = `
    # direct sources listed for strict deps support
    srcs = [
        ${list}
    ],`;
    }
    let depsStarlark = '';
    if (pkgs.length) {
        const list = pkgs.map(pkg => `"//${pkg._dir}:${pkg._name}__contents",`).join('\n        ');
        depsStarlark = `
    # flattened list of direct and transitive dependencies hoisted to root by the package manager
    deps = [
        ${list}
    ],`;
    }
    let exportsStarlark = '';
    pkgs.forEach(pkg => {
        pkg._files.forEach(f => {
            exportsStarlark += `    "node_modules/${pkg._dir}/${f}",
`;
        });
    });
    let buildFile = generateBuildFileHeader() + `load("@build_bazel_rules_nodejs//:index.bzl", "js_library")

exports_files([
${exportsStarlark}])

# The node_modules directory in one catch-all js_library.
# NB: Using this target may have bad performance implications if
# there are many files in target.
# See https://github.com/bazelbuild/bazel/issues/5153.
js_library(
    name = "node_modules",${pkgFilesStarlark}${depsStarlark}
)

`;
    try {
        buildFile += fs.readFileSync(`manual_build_file_contents`, { encoding: 'utf8' });
    }
    catch (e) {
    }
    writeFileSync('BUILD.bazel', buildFile);
}
function generatePackageBuildFiles(pkg) {
    let buildFilePath;
    if (pkg._files.includes('BUILD'))
        buildFilePath = 'BUILD';
    if (pkg._files.includes('BUILD.bazel'))
        buildFilePath = 'BUILD.bazel';
    const nodeModulesPkgDir = `node_modules/${pkg._dir}`;
    const isPkgDirASymlink = fs.lstatSync(nodeModulesPkgDir).isSymbolicLink();
    const symlinkBuildFile = isPkgDirASymlink && buildFilePath;
    if (!symlinkBuildFile && isPkgDirASymlink) {
        console.log(`[yarn_install/npm_install]: package ${nodeModulesPkgDir} is local symlink and as such a BUILD file for it is expected but none was found. Please add one at ${fs.realpathSync(nodeModulesPkgDir)}`);
    }
    let buildFile = printPackage(pkg);
    if (buildFilePath) {
        buildFile = buildFile + '\n' +
            fs.readFileSync(path.join('node_modules', pkg._dir, buildFilePath), 'utf-8');
    }
    else {
        buildFilePath = 'BUILD.bazel';
    }
    const visibility = !pkg._directDependency && STRICT_VISIBILITY ? LIMITED_VISIBILITY : PUBLIC_VISIBILITY;
    if (!pkg._files.includes('bin/BUILD.bazel') && !pkg._files.includes('bin/BUILD')) {
        const binBuildFile = printPackageBin(pkg);
        if (binBuildFile.length) {
            writeFileSync(path.posix.join(pkg._dir, 'bin', 'BUILD.bazel'), generateBuildFileHeader(visibility) + binBuildFile);
        }
    }
    if (pkg._files.includes('index.bzl')) {
        pkg._files.filter(f => f !== 'BUILD' && f !== 'BUILD.bazel').forEach(file => {
            if (/^node_modules[/\\]/.test(file)) {
                return;
            }
            let destFile = path.posix.join(pkg._dir, file);
            const basename = path.basename(file);
            const basenameUc = basename.toUpperCase();
            if (basenameUc === '_BUILD' || basenameUc === '_BUILD.BAZEL') {
                destFile = path.posix.join(path.dirname(destFile), basename.substr(1));
            }
            const src = path.posix.join('node_modules', pkg._dir, file);
            mkdirp(path.dirname(destFile));
            fs.copyFileSync(src, destFile);
        });
    }
    else {
        const indexFile = printIndexBzl(pkg);
        if (indexFile.length) {
            writeFileSync(path.posix.join(pkg._dir, 'index.bzl'), indexFile);
            buildFile += `
# For integration testing
exports_files(["index.bzl"])
`;
        }
    }
    if (!symlinkBuildFile) {
        writeFileSync(path.posix.join(pkg._dir, buildFilePath), generateBuildFileHeader(visibility) + buildFile);
    }
    else {
        const realPathBuildFileForPkg = fs.realpathSync(path.posix.join(nodeModulesPkgDir, buildFilePath));
        createFileSymlinkSync(realPathBuildFileForPkg, path.posix.join(pkg._dir, buildFilePath));
    }
}
function generateBazelWorkspaces(pkgs) {
    const workspaces = {};
    for (const pkg of pkgs) {
        if (!pkg.bazelWorkspaces) {
            continue;
        }
        for (const workspace of Object.keys(pkg.bazelWorkspaces)) {
            if (workspaces[workspace]) {
                console.error(`Could not setup Bazel workspace ${workspace} requested by npm ` +
                    `package ${pkg._dir}@${pkg.version}. Already setup by ${workspaces[workspace]}`);
                process.exit(1);
            }
            generateBazelWorkspace(pkg, workspace);
            workspaces[workspace] = `${pkg._dir}@${pkg.version}`;
        }
    }
    generateInstallBazelDependencies(Object.keys(workspaces));
}
function generateBazelWorkspace(pkg, workspace) {
    let bzlFile = `# Generated by the yarn_install/npm_install rule
load("@build_bazel_rules_nodejs//internal/copy_repository:copy_repository.bzl", "copy_repository")

def _maybe(repo_rule, name, **kwargs):
    if name not in native.existing_rules():
        repo_rule(name = name, **kwargs)
`;
    const rootPath = pkg.bazelWorkspaces[workspace].rootPath;
    if (!rootPath) {
        console.error(`Malformed bazelWorkspaces attribute in ${pkg._dir}@${pkg.version}. ` +
            `Missing rootPath for workspace ${workspace}.`);
        process.exit(1);
    }
    const workspaceSourcePath = path.posix.join('_workspaces', workspace);
    mkdirp(workspaceSourcePath);
    pkg._files.forEach(file => {
        if (/^node_modules[/\\]/.test(file)) {
            return;
        }
        let destFile = path.relative(rootPath, file);
        if (destFile.startsWith('..')) {
            return;
        }
        const basename = path.basename(file);
        const basenameUc = basename.toUpperCase();
        if (basenameUc === '_BUILD' || basenameUc === '_BUILD.BAZEL') {
            destFile = path.posix.join(path.dirname(destFile), basename.substr(1));
        }
        const src = path.posix.join('node_modules', pkg._dir, file);
        const dest = path.posix.join(workspaceSourcePath, destFile);
        mkdirp(path.dirname(dest));
        fs.copyFileSync(src, dest);
    });
    if (!hasRootBuildFile(pkg, rootPath)) {
        writeFileSync(path.posix.join(workspaceSourcePath, 'BUILD.bazel'), '# Marker file that this directory is a bazel package');
    }
    const sha256sum = crypto.createHash('sha256');
    sha256sum.update(fs.readFileSync(LOCK_FILE_PATH, { encoding: 'utf8' }));
    writeFileSync(path.posix.join(workspaceSourcePath, '_bazel_workspace_marker'), `# Marker file to used by custom copy_repository rule\n${sha256sum.digest('hex')}`);
    bzlFile += `def install_${workspace}():
    _maybe(
        copy_repository,
        name = "${workspace}",
        marker_file = "@${WORKSPACE}//_workspaces/${workspace}:_bazel_workspace_marker",
    )
`;
    writeFileSync(`install_${workspace}.bzl`, bzlFile);
}
function generateInstallBazelDependencies(workspaces) {
    let bzlFile = `# Generated by the yarn_install/npm_install rule
`;
    workspaces.forEach(workspace => {
        bzlFile += `load(\":install_${workspace}.bzl\", \"install_${workspace}\")
`;
    });
    bzlFile += `def install_bazel_dependencies(suppress_warning = False):
    """Installs all workspaces listed in bazelWorkspaces of all npm packages"""
    if not suppress_warning:
        print("""
NOTICE: install_bazel_dependencies is no longer needed,
since @bazel/* npm packages can be load()ed without copying to another repository.
See https://github.com/bazelbuild/rules_nodejs/issues/1877

install_bazel_dependencies is harmful because it causes npm_install/yarn_install to run even
if the requested output artifacts for the build don't require nodejs, making multi-language monorepo
use cases slower.

You should be able to remove install_bazel_workspaces from your WORKSPACE file unless you depend
on a package that exposes a separate repository, like @angular/bazel exposes @npm_angular_bazel//:index.bzl

You can suppress this message by passing "suppress_warning = True" to install_bazel_dependencies()
""")
`;
    workspaces.forEach(workspace => {
        bzlFile += `    install_${workspace}()
`;
    });
    writeFileSync('install_bazel_dependencies.bzl', bzlFile);
}
function generateScopeBuildFiles(scope, pkgs) {
    const buildFile = generateBuildFileHeader() + printScope(scope, pkgs);
    writeFileSync(path.posix.join(scope, 'BUILD.bazel'), buildFile);
}
function isFile(p) {
    return fs.existsSync(p) && fs.statSync(p).isFile();
}
function isDirectory(p) {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
}
function stripBom(s) {
    return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}
function listFiles(rootDir, subDir = '') {
    const dir = path.posix.join(rootDir, subDir);
    if (!isDirectory(dir)) {
        return [];
    }
    return fs.readdirSync(dir)
        .reduce((files, file) => {
        const fullPath = path.posix.join(dir, file);
        const relPath = path.posix.join(subDir, file);
        const isSymbolicLink = fs.lstatSync(fullPath).isSymbolicLink();
        let stat;
        try {
            stat = fs.statSync(fullPath);
        }
        catch (e) {
            if (isSymbolicLink) {
                return files;
            }
            throw e;
        }
        const isDirectory = stat.isDirectory();
        if (isDirectory && isSymbolicLink) {
            return files;
        }
        return isDirectory ? files.concat(listFiles(rootDir, relPath)) : files.concat(relPath);
    }, [])
        .sort();
}
function hasRootBuildFile(pkg, rootPath) {
    for (const file of pkg._files) {
        const fileUc = path.relative(rootPath, file).toUpperCase();
        if (fileUc === 'BUILD' || fileUc === 'BUILD.BAZEL' ||
            fileUc === '_BUILD' || fileUc === '_BUILD.BAZEL') {
            return true;
        }
    }
    return false;
}
function getDirectDependencySet(pkgJsonPath) {
    const pkgJson = JSON.parse(stripBom(fs.readFileSync(pkgJsonPath, { encoding: 'utf8' })));
    const dependencies = Object.keys(pkgJson.dependencies || {});
    const devDependencies = Object.keys(pkgJson.devDependencies || {});
    return new Set([...dependencies, ...devDependencies]);
}
exports.getDirectDependencySet = getDirectDependencySet;
function findPackages(p, dependencies) {
    if (!isDirectory(p)) {
        return [];
    }
    const pkgs = [];
    const listing = fs.readdirSync(p);
    const packages = listing
        .filter(f => !f.startsWith('@'))
        .filter(f => !f.startsWith('.'))
        .map(f => path.posix.join(p, f))
        .filter(f => isDirectory(f));
    packages.forEach(f => {
        pkgs.push(parsePackage(f, dependencies), ...findPackages(path.posix.join(f, 'node_modules'), dependencies));
    });
    const scopes = listing.filter(f => f.startsWith('@'))
        .map(f => path.posix.join(p, f))
        .filter(f => isDirectory(f));
    scopes.forEach(f => pkgs.push(...findPackages(f, dependencies)));
    return pkgs;
}
function findScopes() {
    const p = 'node_modules';
    if (!isDirectory(p)) {
        return [];
    }
    const listing = fs.readdirSync(p);
    const scopes = listing.filter(f => f.startsWith('@'))
        .map(f => path.posix.join(p, f))
        .filter(f => isDirectory(f))
        .map(f => f.replace(/^node_modules\//, ''));
    return scopes;
}
function parsePackage(p, dependencies = new Set()) {
    const packageJson = path.posix.join(p, 'package.json');
    const pkg = isFile(packageJson) ?
        JSON.parse(stripBom(fs.readFileSync(packageJson, { encoding: 'utf8' }))) :
        { version: '0.0.0' };
    pkg._dir = p.replace(/^node_modules\//, '');
    pkg._name = pkg._dir.split('/').pop();
    pkg._moduleName = pkg.name || `${pkg._dir}/${pkg._name}`;
    pkg._isNested = /\/node_modules\//.test(p);
    pkg._files = listFiles(p);
    pkg._runfiles = pkg._files.filter((f) => !/[^\x21-\x7E]/.test(f));
    pkg._dependencies = [];
    pkg._directDependency = dependencies.has(pkg._moduleName);
    return pkg;
}
exports.parsePackage = parsePackage;
function isValidBinPath(entry) {
    return isValidBinPathStringValue(entry) || isValidBinPathObjectValues(entry);
}
function isValidBinPathStringValue(entry) {
    return typeof entry === 'string' && entry !== '';
}
function isValidBinPathObjectValues(entry) {
    return entry && typeof entry === 'object' &&
        Object['values'](entry).filter(_entry => isValidBinPath(_entry)).length > 0;
}
function cleanupBinPath(p) {
    p = p.replace(/\\/g, '/');
    if (p.indexOf('./') === 0) {
        p = p.slice(2);
    }
    return p;
}
function cleanupEntryPointPath(p) {
    p = p.replace(/\\/g, '/');
    if (p.indexOf('./') === 0) {
        p = p.slice(2);
    }
    if (p.endsWith('/')) {
        p += 'index.js';
    }
    return p;
}
function findEntryFile(pkg, path) {
    const cleanPath = cleanupEntryPointPath(path);
    const entryFile = findFile(pkg, cleanPath) || findFile(pkg, `${cleanPath}.js`);
    if (!entryFile) {
        log_verbose(`could not find entry point for the path ${cleanPath} given by npm package ${pkg._name}`);
    }
    return entryFile;
}
function resolveMainFile(pkg, mainFileName) {
    const mainEntryField = pkg[mainFileName];
    if (mainEntryField) {
        if (typeof mainEntryField === 'string') {
            return findEntryFile(pkg, mainEntryField);
        }
        else if (typeof mainEntryField === 'object' && mainFileName === 'browser') {
            const indexEntryPoint = mainEntryField['index.js'] || mainEntryField['./index.js'];
            if (indexEntryPoint) {
                return findEntryFile(pkg, indexEntryPoint);
            }
        }
    }
}
function resolvePkgMainFile(pkg) {
    const mainFileNames = ['browser', 'module', 'main'];
    for (const mainFile of mainFileNames) {
        const resolvedMainFile = resolveMainFile(pkg, mainFile);
        if (resolvedMainFile) {
            return resolvedMainFile;
        }
    }
    const maybeRootIndex = findEntryFile(pkg, 'index.js');
    if (maybeRootIndex) {
        return maybeRootIndex;
    }
    const maybeSelfNamedIndex = findEntryFile(pkg, `${pkg._name}.js`);
    if (maybeSelfNamedIndex) {
        return maybeSelfNamedIndex;
    }
    log_verbose(`could not find entry point for npm package ${pkg._name}`);
    return undefined;
}
function flattenPkgDependencies(pkg, dep, pkgsMap) {
    if (pkg._dependencies.indexOf(dep) !== -1) {
        return;
    }
    pkg._dependencies.push(dep);
    const findDeps = function (targetDeps, required, depType) {
        Object.keys(targetDeps || {})
            .map(targetDep => {
            const dirSegments = dep._dir.split('/');
            while (dirSegments.length) {
                const maybe = path.posix.join(...dirSegments, 'node_modules', targetDep);
                if (pkgsMap.has(maybe)) {
                    return pkgsMap.get(maybe);
                }
                dirSegments.pop();
            }
            if (pkgsMap.has(targetDep)) {
                return pkgsMap.get(targetDep);
            }
            if (required) {
                console.error(`could not find ${depType} '${targetDep}' of '${dep._dir}'`);
                process.exit(1);
            }
            return null;
        })
            .filter(dep => !!dep)
            .forEach(dep => flattenPkgDependencies(pkg, dep, pkgsMap));
    };
    if (dep.dependencies && dep.optionalDependencies) {
        Object.keys(dep.optionalDependencies).forEach(optionalDep => {
            delete dep.dependencies[optionalDep];
        });
    }
    findDeps(dep.dependencies, true, 'dependency');
    findDeps(dep.peerDependencies, false, 'peer dependency');
    findDeps(dep.optionalDependencies, false, 'optional dependency');
}
function printJson(pkg) {
    const cloned = Object.assign({}, pkg);
    cloned._dependencies = pkg._dependencies.map(dep => dep._dir);
    delete cloned._files;
    delete cloned._runfiles;
    return JSON.stringify(cloned, null, 2).split('\n').map(line => `# ${line}`).join('\n');
}
function filterFiles(files, exts = []) {
    if (exts.length) {
        const allowNoExts = exts.includes('');
        files = files.filter(f => {
            if (allowNoExts && !path.extname(f))
                return true;
            const lc = f.toLowerCase();
            for (const e of exts) {
                if (e && lc.endsWith(e.toLowerCase())) {
                    return true;
                }
            }
            return false;
        });
    }
    return files.filter(file => {
        const basenameUc = path.basename(file).toUpperCase();
        if (basenameUc === 'BUILD' || basenameUc === 'BUILD.BAZEL') {
            return false;
        }
        return true;
    });
}
function isNgApfPackage(pkg) {
    const set = new Set(pkg._files);
    if (set.has('ANGULAR_PACKAGE')) {
        return true;
    }
    const metadataExt = /\.metadata\.json$/;
    return pkg._files.some((file) => {
        if (metadataExt.test(file)) {
            const sibling = file.replace(metadataExt, '.d.ts');
            if (set.has(sibling)) {
                return true;
            }
        }
        return false;
    });
}
function findFile(pkg, m) {
    const ml = m.toLowerCase();
    for (const f of pkg._files) {
        if (f.toLowerCase() === ml) {
            return f;
        }
    }
    return undefined;
}
function printPackage(pkg) {
    function starlarkFiles(attr, files, comment = '') {
        return `
    ${comment ? comment + '\n    ' : ''}${attr} = [
        ${files.map((f) => `"//:node_modules/${pkg._dir}/${f}",`).join('\n        ')}
    ],`;
    }
    const includedRunfiles = filterFiles(pkg._runfiles, INCLUDED_FILES);
    const pkgFiles = includedRunfiles.filter((f) => !f.startsWith('node_modules/'));
    const pkgFilesStarlark = pkgFiles.length ? starlarkFiles('srcs', pkgFiles) : '';
    const nestedNodeModules = includedRunfiles.filter((f) => f.startsWith('node_modules/'));
    const nestedNodeModulesStarlark = nestedNodeModules.length ? starlarkFiles('srcs', nestedNodeModules) : '';
    const notPkgFiles = pkg._files.filter((f) => !f.startsWith('node_modules/') && !includedRunfiles.includes(f));
    const notPkgFilesStarlark = notPkgFiles.length ? starlarkFiles('srcs', notPkgFiles) : '';
    const namedSources = isNgApfPackage(pkg) ?
        filterFiles(pkg._runfiles, ['.umd.js', '.ngfactory.js', '.ngsummary.js']) :
        [];
    const namedSourcesStarlark = namedSources.length ?
        starlarkFiles('named_module_srcs', namedSources, '# subset of srcs that are javascript named-UMD or named-AMD scripts') :
        '';
    const dtsSources = filterFiles(pkg._runfiles, ['.d.ts']).filter((f) => !f.startsWith('node_modules/'));
    const dtsStarlark = dtsSources.length ?
        starlarkFiles('srcs', dtsSources, `# ${pkg._dir} package declaration files (and declaration files in nested node_modules)`) :
        '';
    const deps = [pkg].concat(pkg._dependencies.filter(dep => dep !== pkg && !dep._isNested));
    const depsStarlark = deps.map(dep => `"//${dep._dir}:${dep._name}__contents",`).join('\n        ');
    let result = `load("@build_bazel_rules_nodejs//:index.bzl", "js_library")

# Generated targets for npm package "${pkg._dir}"
${printJson(pkg)}

# Files that are part of the npm package not including its nested node_modules
# (filtered by the 'included_files' attribute)
filegroup(
    name = "${pkg._name}__files",${pkgFilesStarlark}
)

# Files that are in the npm package's nested node_modules
# (filtered by the 'included_files' attribute)
filegroup(
    name = "${pkg._name}__nested_node_modules",${nestedNodeModulesStarlark}
    visibility = ["//:__subpackages__"],
)

# Files that have been excluded from the ${pkg._name}__files target above because
# they are filtered out by 'included_files' or because they are not valid runfiles
# See https://github.com/bazelbuild/bazel/issues/4327.
filegroup(
    name = "${pkg._name}__not_files",${notPkgFilesStarlark}
    visibility = ["//visibility:private"],
)

# All of the files in the npm package including files that have been
# filtered out by 'included_files' or because they are not valid runfiles
# but not including nested node_modules.
filegroup(
    name = "${pkg._name}__all_files",
    srcs = [":${pkg._name}__files", ":${pkg._name}__not_files"],
)

# The primary target for this package for use in rule deps
js_library(
    name = "${pkg._name}",
    # direct sources listed for strict deps support
    srcs = [":${pkg._name}__files"],
    # nested node_modules for this package plus flattened list of direct and transitive dependencies
    # hoisted to root by the package manager
    deps = [
        ${depsStarlark}
    ],
)

# Target is used as dep for main targets to prevent circular dependencies errors
js_library(
    name = "${pkg._name}__contents",
    srcs = [":${pkg._name}__files", ":${pkg._name}__nested_node_modules"],${namedSourcesStarlark}
    visibility = ["//:__subpackages__"],
)

# Typings files that are part of the npm package not including nested node_modules
js_library(
    name = "${pkg._name}__typings",${dtsStarlark}
)

`;
    let mainEntryPoint = resolvePkgMainFile(pkg);
    if (mainEntryPoint && !findFile(pkg, `${pkg._name}.umd.js`)) {
        result +=
            `load("@build_bazel_rules_nodejs//internal/npm_install:npm_umd_bundle.bzl", "npm_umd_bundle")

npm_umd_bundle(
    name = "${pkg._name}__umd",
    package_name = "${pkg._moduleName}",
    entry_point = "//:node_modules/${pkg._dir}/${mainEntryPoint}",
    package = ":${pkg._name}",
)

`;
    }
    return result;
}
function _findExecutables(pkg) {
    const executables = new Map();
    if (isValidBinPath(pkg.bin)) {
        if (!pkg._isNested) {
            if (Array.isArray(pkg.bin)) {
                if (pkg.bin.length == 1) {
                    executables.set(pkg._dir, cleanupBinPath(pkg.bin[0]));
                }
                else {
                }
            }
            else if (typeof pkg.bin === 'string') {
                executables.set(pkg._dir, cleanupBinPath(pkg.bin));
            }
            else if (typeof pkg.bin === 'object') {
                for (let key in pkg.bin) {
                    if (isValidBinPathStringValue(pkg.bin[key])) {
                        executables.set(key, cleanupBinPath(pkg.bin[key]));
                    }
                }
            }
        }
    }
    return executables;
}
function additionalAttributes(pkg, name) {
    let additionalAttributes = '';
    if (pkg.bazelBin && pkg.bazelBin[name] && pkg.bazelBin[name].additionalAttributes) {
        const attrs = pkg.bazelBin[name].additionalAttributes;
        for (const attrName of Object.keys(attrs)) {
            const attrValue = attrs[attrName];
            additionalAttributes += `\n    ${attrName} = ${attrValue},`;
        }
    }
    return additionalAttributes;
}
function printPackageBin(pkg) {
    let result = '';
    const executables = _findExecutables(pkg);
    if (executables.size) {
        result = `load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

`;
        const data = [`//${pkg._dir}:${pkg._name}`];
        if (pkg._dynamicDependencies) {
            data.push(...pkg._dynamicDependencies);
        }
        for (const [name, path] of executables.entries()) {
            result += `# Wire up the \`bin\` entry \`${name}\`
nodejs_binary(
    name = "${name}",
    entry_point = "//:node_modules/${pkg._dir}/${path}",
    data = [${data.map(p => `"${p}"`).join(', ')}],
    templated_args = ["--nobazel_patch_module_resolver"],${additionalAttributes(pkg, name)}
)
`;
        }
    }
    return result;
}
exports.printPackageBin = printPackageBin;
function printIndexBzl(pkg) {
    let result = '';
    const executables = _findExecutables(pkg);
    if (executables.size) {
        result =
            `load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary", "nodejs_test", "npm_package_bin")

`;
        const data = [`@${WORKSPACE}//${pkg._dir}:${pkg._name}`];
        if (pkg._dynamicDependencies) {
            data.push(...pkg._dynamicDependencies);
        }
        for (const [name, path] of executables.entries()) {
            result = `${result}

# Generated helper macro to call ${name}
def ${name.replace(/-/g, '_')}(**kwargs):
    output_dir = kwargs.pop("output_dir", False)
    if "outs" in kwargs or output_dir:
        npm_package_bin(tool = "@${WORKSPACE}//${pkg._dir}/bin:${name}", output_dir = output_dir, **kwargs)
    else:
        nodejs_binary(
            entry_point = "@${WORKSPACE}//:node_modules/${pkg._dir}/${path}",
            data = [${data.map(p => `"${p}"`).join(', ')}] + kwargs.pop("data", []),
            templated_args = ["--nobazel_patch_module_resolver"] + kwargs.pop("templated_args", []),${additionalAttributes(pkg, name)}
            **kwargs
        )

# Just in case ${name} is a test runner, also make a test rule for it
def ${name.replace(/-/g, '_')}_test(**kwargs):
    nodejs_test(
      entry_point = "@${WORKSPACE}//:node_modules/${pkg._dir}/${path}",
      data = [${data.map(p => `"${p}"`).join(', ')}] + kwargs.pop("data", []),
      templated_args = ["--nobazel_patch_module_resolver"] + kwargs.pop("templated_args", []),${additionalAttributes(pkg, name)}
      **kwargs
    )
`;
        }
    }
    return result;
}
exports.printIndexBzl = printIndexBzl;
function printScope(scope, pkgs) {
    pkgs = pkgs.filter(pkg => !pkg._isNested && pkg._dir.startsWith(`${scope}/`));
    let deps = [];
    pkgs.forEach(pkg => {
        deps = deps.concat(pkg._dependencies.filter(dep => !dep._isNested && !pkgs.includes(pkg)));
    });
    deps = [...pkgs, ...new Set(deps)];
    let pkgFilesStarlark = '';
    if (deps.length) {
        const list = deps.map(dep => `"//${dep._dir}:${dep._name}__files",`).join('\n        ');
        pkgFilesStarlark = `
    # direct sources listed for strict deps support
    srcs = [
        ${list}
    ],`;
    }
    let depsStarlark = '';
    if (deps.length) {
        const list = deps.map(dep => `"//${dep._dir}:${dep._name}__contents",`).join('\n        ');
        depsStarlark = `
    # flattened list of direct and transitive dependencies hoisted to root by the package manager
    deps = [
        ${list}
    ],`;
    }
    return `load("@build_bazel_rules_nodejs//:index.bzl", "js_library")

# Generated target for npm scope ${scope}
js_library(
    name = "${scope}",${pkgFilesStarlark}${depsStarlark}
)

`;
}

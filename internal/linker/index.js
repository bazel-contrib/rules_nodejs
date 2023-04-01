/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = exports.reduceModules = void 0;
/**
 * @fileoverview Creates a node_modules directory in the current working directory
 * and symlinks in the node modules needed to run a program.
 * This replaces the need for custom module resolution logic inside the process.
 */
const fs = require("fs");
const path = require("path");
// We cannot rely from the linker on the `@bazel/runfiles` package, hence we import from
// the runfile helper through a checked-in file from `internal/runfiles`. In order to still
// have typings we use a type-only import to the `@bazel/runfiles` package that is the source
// of truth for the checked-in file.
const { runfiles: _defaultRunfiles, _BAZEL_OUT_REGEX } = require('../runfiles/index.cjs');
// Run Bazel with --define=VERBOSE_LOGS=1 to enable this logging
const VERBOSE_LOGS = !!process.env['VERBOSE_LOGS'];
function log_verbose(...m) {
    if (VERBOSE_LOGS)
        console.error('[link_node_modules.js]', ...m);
}
function log_error(error) {
    console.error('[link_node_modules.js] An error has been reported:', error, error.stack);
}
/**
 * Create a new directory and any necessary subdirectories
 * if they do not exist.
 */
function mkdirp(p) {
    return __awaiter(this, void 0, void 0, function* () {
        if (p && !(yield exists(p))) {
            yield mkdirp(path.dirname(p));
            log_verbose(`creating directory ${p} in ${process.cwd()}`);
            try {
                yield fs.promises.mkdir(p);
            }
            catch (e) {
                if (e.code !== 'EEXIST') {
                    // can happen if path being created exists via a symlink
                    throw e;
                }
            }
        }
    });
}
/**
 * Gets the `lstat` results for a given path. Returns `null` if the path
 * does not exist on disk.
 */
function gracefulLstat(path) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield fs.promises.lstat(path);
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                return null;
            }
            throw e;
        }
    });
}
/**
 * Resolves a symlink to its linked path for a given path. Returns `null` if the path
 * does not exist on disk.
 */
function gracefulReadlink(path) {
    try {
        return fs.readlinkSync(path);
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            return null;
        }
        throw e;
    }
}
/**
 * Lists the names of files and directories that exist in the given path. Returns an empty
 * array if the path does not exist on disk.
 */
function gracefulReaddir(path) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield fs.promises.readdir(path);
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                return [];
            }
            throw e;
        }
    });
}
/**
 * Deletes the given module name from the current working directory (i.e. symlink root).
 * If the module name resolves to a directory, the directory is deleted. Otherwise the
 * existing file or junction is unlinked.
 */
function unlink(moduleName) {
    return __awaiter(this, void 0, void 0, function* () {
        const stat = yield gracefulLstat(moduleName);
        if (stat === null) {
            return;
        }
        log_verbose(`unlink( ${moduleName} )`);
        if (stat.isDirectory()) {
            yield deleteDirectory(moduleName);
        }
        else {
            log_verbose("Deleting file: ", moduleName);
            yield fs.promises.unlink(moduleName);
        }
    });
}
/** Asynchronously deletes a given directory (with contents). */
function deleteDirectory(p) {
    return __awaiter(this, void 0, void 0, function* () {
        log_verbose("Deleting children of", p);
        for (let entry of yield gracefulReaddir(p)) {
            const childPath = path.join(p, entry);
            const stat = yield gracefulLstat(childPath);
            if (stat === null) {
                log_verbose(`File does not exist, but is listed as directory entry: ${childPath}`);
                continue;
            }
            if (stat.isDirectory()) {
                yield deleteDirectory(childPath);
            }
            else {
                log_verbose("Deleting file", childPath);
                yield fs.promises.unlink(childPath);
            }
        }
        log_verbose("Cleaning up dir", p);
        yield fs.promises.rmdir(p);
    });
}
function symlink(target, p) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!path.isAbsolute(target)) {
            target = path.resolve(process.cwd(), target);
        }
        log_verbose(`creating symlink ${p} -> ${target}`);
        // Use junction on Windows since symlinks require elevated permissions.
        // We only link to directories so junctions work for us.
        try {
            yield fs.promises.symlink(target, p, 'junction');
            return true;
        }
        catch (e) {
            if (e.code !== 'EEXIST') {
                throw e;
            }
            // We assume here that the path is already linked to the correct target.
            // Could add some logic that asserts it here, but we want to avoid an extra
            // filesystem access so we should only do it under some kind of strict mode.
            if (VERBOSE_LOGS) {
                // Be verbose about creating a bad symlink
                // Maybe this should fail in production as well, but again we want to avoid
                // any unneeded file I/O
                if (!(yield exists(p))) {
                    log_verbose('ERROR\n***\nLooks like we created a bad symlink:' +
                        `\n  pwd ${process.cwd()}\n  target ${target}\n  path ${p}\n***`);
                }
            }
            return false;
        }
    });
}
/** Determines an absolute path to the given workspace if it contains node modules. */
function resolveWorkspaceNodeModules(externalWorkspace, startCwd, isExecroot, execroot, runfiles) {
    return __awaiter(this, void 0, void 0, function* () {
        const targetManifestPath = `${externalWorkspace}/node_modules`;
        if (isExecroot) {
            // Under execroot, the npm workspace will be under an external folder from the startCwd
            // `execroot/my_wksp`. For example, `execroot/my_wksp/external/npm/node_modules`. If there is no
            // npm workspace, which will be the case if there are no third-party modules dependencies for
            // this target, npmWorkspace the root to `execroot/my_wksp/node_modules`.
            return `${execroot}/external/${targetManifestPath}`;
        }
        if (!execroot) {
            // This can happen if we are inside a nodejs_image or a nodejs_binary is run manually.
            // Resolve as if we are in runfiles in a sandbox.
            return path.resolve(`${startCwd}/../${targetManifestPath}`);
        }
        // Under runfiles, the linker should symlink node_modules at `execroot/my_wksp`
        // so that when there are no runfiles (default on Windows) and scripts run out of
        // `execroot/my_wksp` they can resolve node_modules with standard node_module resolution
        // If we got a runfilesManifest map, look through it for a resolution
        // This will happen if we are running a binary that had some npm packages
        // "statically linked" into its runfiles
        const fromManifest = runfiles.resolve(targetManifestPath);
        if (fromManifest) {
            return fromManifest;
        }
        else {
            const maybe = path.resolve(`${execroot}/external/${targetManifestPath}`);
            if (yield exists(maybe)) {
                // Under runfiles, when not in the sandbox we must symlink node_modules down at the execroot
                // `execroot/my_wksp/external/npm/node_modules` since `runfiles/npm/node_modules` will be a
                // directory and not a symlink back to the root node_modules where we expect
                // to resolve from. This case is tested in internal/linker/test/local.
                return maybe;
            }
            // However, when in the sandbox, `execroot/my_wksp/external/npm/node_modules` does not exist,
            // so we must symlink into `runfiles/npm/node_modules`. This directory exists whether legacy
            // external runfiles are on or off.
            return path.resolve(`${startCwd}/../${targetManifestPath}`);
        }
    });
}
// There is no fs.promises.exists function because
// node core is of the opinion that exists is always too racey to rely on.
function exists(p) {
    return __awaiter(this, void 0, void 0, function* () {
        return ((yield gracefulLstat(p)) !== null);
    });
}
function existsSync(p) {
    if (!p) {
        return false;
    }
    try {
        fs.lstatSync(p);
        return true;
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            return false;
        }
        throw e;
    }
}
/**
 * Given a set of module aliases returns an array of recursive `LinkerTreeElement`.
 *
 * The tree nodes represent the FS links required to represent the module aliases.
 * Each node of the tree hierarchy depends on its parent node having been setup first.
 * Each sibling node can be processed concurrently.
 *
 * The number of symlinks is minimized in situations such as:
 *
 * Shared parent path to lowest common denominator:
 *    `@foo/b/c => /path/to/a/b/c`
 *
 *    can be represented as
 *
 *    `@foo => /path/to/a`
 *
 * Shared parent path across multiple module names:
 *    `@foo/p/a => /path/to/x/a`
 *    `@foo/p/c => /path/to/x/a`
 *
 *    can be represented as a single parent
 *
 *    `@foo/p => /path/to/x`
 */
function reduceModules(modules) {
    return buildModuleHierarchy(Object.keys(modules).sort(), modules, '/').children || [];
}
exports.reduceModules = reduceModules;
function buildModuleHierarchy(moduleNames, modules, elementPath) {
    let element = {
        name: elementPath.slice(0, -1),
        link: modules[elementPath.slice(0, -1)],
        children: [],
    };
    for (let i = 0; i < moduleNames.length;) {
        const moduleName = moduleNames[i];
        const next = moduleName.indexOf('/', elementPath.length + 1);
        const moduleGroup = (next === -1) ? (moduleName + '/') : moduleName.slice(0, next + 1);
        // An exact match (direct child of element) then it is the element parent, skip it
        if (next === -1) {
            i++;
        }
        const siblings = [];
        while (i < moduleNames.length && moduleNames[i].startsWith(moduleGroup)) {
            siblings.push(moduleNames[i++]);
        }
        let childElement = buildModuleHierarchy(siblings, modules, moduleGroup);
        for (let cur = childElement; (cur = liftElement(childElement)) !== childElement;) {
            childElement = cur;
        }
        element.children.push(childElement);
    }
    // Cleanup empty children+link
    if (!element.link) {
        delete element.link;
    }
    if (!element.children || element.children.length === 0) {
        delete element.children;
    }
    return element;
}
function liftElement(element) {
    let { name, link, children } = element;
    if (!children || !children.length) {
        return element;
    }
    // This element has a link and all the child elements have aligning links
    // => this link alone represents that structure
    if (link && allElementsAlignUnder(name, link, children)) {
        return { name, link };
    }
    return element;
}
function allElementsAlignUnder(parentName, parentLink, elements) {
    for (const { name, link, children } of elements) {
        if (!link || children) {
            return false;
        }
        if (!isDirectChildPath(parentName, name)) {
            return false;
        }
        if (!isDirectChildLink(parentLink, link)) {
            return false;
        }
        if (!isNameLinkPathTopAligned(name, link)) {
            return false;
        }
    }
    return true;
}
function isDirectChildPath(parent, child) {
    return parent === path.dirname(child);
}
function isDirectChildLink(parentLink, childLink) {
    return parentLink === path.dirname(childLink);
}
function isNameLinkPathTopAligned(namePath, linkPath) {
    return path.basename(namePath) === path.basename(linkPath);
}
function visitDirectoryPreserveLinks(dirPath, visit) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const entry of yield fs.promises.readdir(dirPath)) {
            const childPath = path.join(dirPath, entry);
            const stat = yield gracefulLstat(childPath);
            if (stat === null) {
                continue;
            }
            if (stat.isDirectory()) {
                yield visitDirectoryPreserveLinks(childPath, visit);
            }
            else {
                yield visit(childPath, stat);
            }
        }
    });
}
function findExecroot(startCwd) {
    // We can derive if the process is being run in the execroot if there is a bazel-out folder
    if (existsSync(`${startCwd}/bazel-out`)) {
        return startCwd;
    }
    // Look for bazel-out which is used to determine the the path to `execroot/my_wksp`. This works in
    // all cases including on rbe where the execroot is a path such as `/b/f/w`. For example, when in
    // runfiles on rbe, bazel runs the process in a directory such as
    // `/b/f/w/bazel-out/k8-fastbuild/bin/path/to/pkg/some_test.sh.runfiles/my_wksp`. From here we can
    // determine the execroot `b/f/w` by finding the first instance of bazel-out.
    // NB: If we are inside nodejs_image or a nodejs_binary run manually there may be no execroot
    // found.
    const bazelOutMatch = startCwd.match(_BAZEL_OUT_REGEX);
    return bazelOutMatch ? startCwd.slice(0, bazelOutMatch.index) : undefined;
}
function main(args, runfiles) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!args || args.length < 1)
            throw new Error('requires one argument: modulesManifest path');
        const [modulesManifest] = args;
        log_verbose('manifest file:', modulesManifest);
        let { workspace, bin, roots, module_sets } = JSON.parse(fs.readFileSync(modulesManifest));
        log_verbose('manifest contents:', JSON.stringify({ workspace, bin, roots, module_sets }, null, 2));
        roots = roots || {};
        module_sets = module_sets || {};
        // Bazel starts actions with pwd=execroot/my_wksp when under execroot or pwd=runfiles/my_wksp
        // when under runfiles.
        // Normalize the slashes in startCwd for easier matching and manipulation.
        const startCwd = process.cwd().replace(/\\/g, '/');
        log_verbose('startCwd:', startCwd);
        const execroot = findExecroot(startCwd);
        log_verbose('execroot:', execroot ? execroot : 'not found');
        const isExecroot = startCwd == execroot;
        log_verbose('isExecroot:', isExecroot.toString());
        const isBazelRun = !!process.env['BUILD_WORKSPACE_DIRECTORY'];
        log_verbose('isBazelRun:', isBazelRun.toString());
        if (!isExecroot && execroot) {
            // If we're not in the execroot and we've found one then change to the execroot
            // directory to create the node_modules symlinks
            process.chdir(execroot);
            log_verbose('changed directory to execroot', execroot);
        }
        function symlinkWithUnlink(target, p, stats = null) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!path.isAbsolute(target)) {
                    target = path.resolve(process.cwd(), target);
                }
                if (stats === null) {
                    stats = yield gracefulLstat(p);
                }
                // Check if this an an old out-of-date symlink
                // If we are running without a runfiles manifest (i.e. in sandbox or with symlinked runfiles),
                // then this is guaranteed to be not an artifact from a previous linker run. If not we need to
                // check.
                if (runfiles.manifest && execroot && stats !== null && stats.isSymbolicLink()) {
                    // Although `stats` suggests that the file exists as a symlink, it may have been deleted by
                    // another process. Only proceed unlinking if the file actually still exists.
                    const symlinkPathRaw = gracefulReadlink(p);
                    if (symlinkPathRaw !== null) {
                        const symlinkPath = symlinkPathRaw.replace(/\\/g, '/');
                        if (path.relative(symlinkPath, target) != '' &&
                            !path.relative(execroot, symlinkPath).startsWith('..')) {
                            // Left-over out-of-date symlink from previous run. This can happen if switching between
                            // root configuration options such as `--noenable_runfiles` and/or
                            // `--spawn_strategy=standalone`. It can also happen if two different targets link the
                            // same module name to different targets in a non-sandboxed environment. The latter will
                            // lead to undeterministic behavior.
                            // TODO: can we detect the latter case and throw an apprioriate error?
                            log_verbose(`Out-of-date symlink for ${p} to ${symlinkPath} detected. Target should be ${target}. Unlinking.`);
                            yield unlink(p);
                        }
                        else {
                            log_verbose(`The symlink at ${p} no longer exists, so no need to unlink it.`);
                        }
                    }
                }
                return symlink(target, p);
            });
        }
        // Symlink all node_modules roots defined. These are 3rd party deps in external npm workspaces
        // lined to node_modules folders at the root or in sub-directories
        for (const packagePath of Object.keys(roots)) {
            const externalWorkspace = roots[packagePath];
            let workspaceNodeModules = yield resolveWorkspaceNodeModules(externalWorkspace, startCwd, isExecroot, execroot, runfiles);
            if (yield exists(workspaceNodeModules)) {
                log_verbose(`resolved ${externalWorkspace} external workspace node modules path to ${workspaceNodeModules}`);
            }
            else {
                // There are no third party node_modules to symlink to
                workspaceNodeModules = undefined;
            }
            let primaryNodeModules;
            if (packagePath) {
                const binNodeModules = path.posix.join(bin, packagePath, 'node_modules');
                yield mkdirp(path.dirname(binNodeModules));
                // Create bin/<package_path>/node_modules symlink
                // (or empty directory if there are no 3rd party deps to symlink to)
                if (workspaceNodeModules) {
                    yield symlinkWithUnlink(workspaceNodeModules, binNodeModules);
                    primaryNodeModules = workspaceNodeModules;
                }
                else {
                    yield mkdirp(binNodeModules);
                    primaryNodeModules = binNodeModules;
                }
                if (!isBazelRun) {
                    // Special case under bazel run where we don't want to create node_modules
                    // in an execroot under a package path as this will end up in the user's
                    // workspace via the package path folder symlink
                    const execrootNodeModules = path.posix.join(packagePath, 'node_modules');
                    yield mkdirp(path.dirname(execrootNodeModules));
                    yield symlinkWithUnlink(primaryNodeModules, execrootNodeModules);
                }
            }
            else {
                const execrootNodeModules = 'node_modules';
                // Create execroot/node_modules symlink (or empty directory if there are
                // no 3rd party deps to symlink to)
                if (workspaceNodeModules) {
                    yield symlinkWithUnlink(workspaceNodeModules, execrootNodeModules);
                    primaryNodeModules = workspaceNodeModules;
                }
                else {
                    yield mkdirp(execrootNodeModules);
                    primaryNodeModules = execrootNodeModules;
                }
                // NB: Don't create a bin/node_modules since standard node_modules
                // resolution will fall back to the execroot node_modules naturally. See
                // https://github.com/bazelbuild/rules_nodejs/issues/3054
            }
            // If start cwd was in runfiles then create
            // start/cwd
            if (!isExecroot) {
                const runfilesNodeModules = path.posix.join(startCwd, packagePath, 'node_modules');
                yield mkdirp(path.dirname(runfilesNodeModules));
                // Don't link to the root execroot node_modules if there is a workspace node_modules.
                // Bazel will delete that symlink on rebuild in the ibazel run context.
                yield symlinkWithUnlink(primaryNodeModules, runfilesNodeModules);
            }
            // RUNFILES symlink -> execroot node_modules
            if (process.env['RUNFILES']) {
                const stat = yield gracefulLstat(process.env['RUNFILES']);
                if (stat && stat.isDirectory()) {
                    const runfilesNodeModules = path.posix.join(process.env['RUNFILES'], workspace, 'node_modules');
                    yield mkdirp(path.dirname(runfilesNodeModules));
                    // Don't link to the root execroot node_modules if there is a workspace node_modules.
                    // Bazel will delete that symlink on rebuild in the ibazel run context.
                    yield symlinkWithUnlink(primaryNodeModules, runfilesNodeModules);
                }
            }
        }
        /**
         * Whether the given module resolves to a directory that has been created by a previous linker
         * run purely to make space for deep module links. e.g. consider a mapping for `my-pkg/a11y`.
         * The linker will create folders like `node_modules/my-pkg/` so that the `a11y` symbolic
         * junction can be created. The `my-pkg` folder is then considered a leftover from a previous
         * linker run as it only contains symbolic links and no actual source files.
         */
        function isLeftoverDirectoryFromLinker(stats, modulePath) {
            return __awaiter(this, void 0, void 0, function* () {
                // If we are running without a runfiles manifest (i.e. in sandbox or with symlinked runfiles),
                // then this is guaranteed to be not an artifact from a previous linker run.
                if (runfiles.manifest === undefined) {
                    return false;
                }
                if (!stats.isDirectory()) {
                    return false;
                }
                let isLeftoverFromPreviousLink = true;
                // If the directory contains actual files, this cannot be a leftover from a previous
                // linker run. The linker only creates directories in the node modules that hold
                // symbolic links for configured module mappings.
                yield visitDirectoryPreserveLinks(modulePath, (childPath, childStats) => __awaiter(this, void 0, void 0, function* () {
                    if (!childStats.isSymbolicLink()) {
                        isLeftoverFromPreviousLink = false;
                    }
                }));
                return isLeftoverFromPreviousLink;
            });
        }
        /**
         * Creates a symlink for the given module. Existing child symlinks which are part of
         * the module are preserved in order to not cause race conditions in non-sandbox
         * environments where multiple actions rely on the same node modules root.
         *
         * To avoid unexpected resource removal, a new temporary link for the target is created.
         * Then all symlinks from the existing module are cloned. Once done, the existing module
         * is unlinked while the temporary link takes place for the given module. This ensures
         * that the module link is never removed at any time (causing race condition failures).
         */
        function createSymlinkAndPreserveContents(stats, modulePath, target) {
            return __awaiter(this, void 0, void 0, function* () {
                const tmpPath = `${modulePath}__linker_tmp`;
                log_verbose(`createSymlinkAndPreserveContents( ${modulePath} )`);
                yield symlink(target, tmpPath);
                yield visitDirectoryPreserveLinks(modulePath, (childPath, stat) => __awaiter(this, void 0, void 0, function* () {
                    if (stat.isSymbolicLink()) {
                        const targetPath = path.join(tmpPath, path.relative(modulePath, childPath));
                        log_verbose(`Cloning symlink into temporary created link ( ${childPath} )`);
                        yield mkdirp(path.dirname(targetPath));
                        yield symlink(targetPath, yield fs.promises.realpath(childPath));
                    }
                }));
                log_verbose(`Removing existing module so that new link can take place ( ${modulePath} )`);
                yield unlink(modulePath);
                yield fs.promises.rename(tmpPath, modulePath);
            });
        }
        function linkModules(package_path, m) {
            return __awaiter(this, void 0, void 0, function* () {
                const symlinkIn = package_path ?
                    path.posix.join(bin, package_path, 'node_modules') :
                    'node_modules';
                // ensure the parent directory exist
                if (path.dirname(m.name)) {
                    yield mkdirp(`${symlinkIn}/${path.dirname(m.name)}`);
                }
                if (m.link) {
                    const modulePath = m.link;
                    let target;
                    if (isExecroot) {
                        // If we're running out of the execroot, try the execroot path first.
                        // If the dependency came in exclusively from a transitive binary target
                        // then the module won't be at this path but in the runfiles of the binary.
                        // In that case we'll fallback to resolving via runfiles below.
                        target = `${startCwd}/${modulePath}`;
                    }
                    if (!isExecroot || !existsSync(target)) {
                        // Transform execroot path to the runfiles manifest path so that
                        // it can be resolved with runfiles.resolve()
                        let runfilesPath = modulePath;
                        if (runfilesPath.startsWith(`${bin}/`)) {
                            runfilesPath = runfilesPath.slice(bin.length + 1);
                        }
                        else if (runfilesPath === bin) {
                            runfilesPath = '';
                        }
                        const externalPrefix = 'external/';
                        if (runfilesPath.startsWith(externalPrefix)) {
                            runfilesPath = runfilesPath.slice(externalPrefix.length);
                        }
                        else {
                            runfilesPath = path.posix.join(workspace, runfilesPath);
                        }
                        try {
                            target = runfiles.resolve(runfilesPath);
                            // if we're resolving from a manifest then make sure we don't resolve
                            // into the source tree when we are expecting the output tree
                            if (runfiles.manifest && modulePath.startsWith(`${bin}/`)) {
                                // Check for BAZEL_OUT_REGEX and not /${bin}/ since resolution
                                // may be in the `/bazel-out/host` if cfg = "host"
                                if (!target.match(_BAZEL_OUT_REGEX)) {
                                    const e = new Error(`could not resolve module ${runfilesPath} in output tree`);
                                    e.code = 'MODULE_NOT_FOUND';
                                    throw e;
                                }
                            }
                        }
                        catch (err) {
                            target = undefined;
                            log_verbose(`runfiles resolve failed for module '${m.name}': ${err.message}`);
                        }
                    }
                    // Ensure target path absolute for consistency
                    if (target && !path.isAbsolute(target)) {
                        target = path.resolve(process.cwd(), target);
                    }
                    const symlinkFile = `${symlinkIn}/${m.name}`;
                    // In environments where runfiles are not symlinked (e.g. Windows), existing linked
                    // modules are preserved. This could cause issues when a link is created at higher level
                    // as a conflicting directory is already on disk. e.g. consider in a previous run, we
                    // linked the modules `my-pkg/overlay`. Later on, in another run, we have a module mapping
                    // for `my-pkg` itself. The linker cannot create `my-pkg` because the directory `my-pkg`
                    // already exists. To ensure that the desired link is generated, we create the new desired
                    // link and move all previous nested links from the old module into the new link. Read more
                    // about this in the description of `createSymlinkAndPreserveContents`.
                    const stats = yield gracefulLstat(symlinkFile);
                    const isLeftOver = (stats !== null && (yield isLeftoverDirectoryFromLinker(stats, symlinkFile)));
                    // Check if the target exists before creating the symlink.
                    // This is an extra filesystem access on top of the symlink but
                    // it is necessary for the time being.
                    if (target && (yield exists(target))) {
                        if (stats !== null && isLeftOver) {
                            yield createSymlinkAndPreserveContents(stats, symlinkFile, target);
                        }
                        else {
                            yield symlinkWithUnlink(target, symlinkFile, stats);
                        }
                    }
                    else {
                        if (!target) {
                            log_verbose(`no symlink target found for module ${m.name}`);
                        }
                        else {
                            // This can happen if a module mapping is propogated from a dependency
                            // but the target that generated the mapping in not in the deps. We don't
                            // want to create symlinks to non-existant targets as this will
                            // break any nested symlinks that may be created under the module name
                            // after this.
                            log_verbose(`potential target ${target} does not exists for module ${m.name}`);
                        }
                        if (isLeftOver) {
                            // Remove left over directory if it exists
                            yield unlink(symlinkFile);
                        }
                    }
                }
                // Process each child branch concurrently
                if (m.children) {
                    yield Promise.all(m.children.map(m => linkModules(package_path, m)));
                }
            });
        }
        const links = [];
        for (const package_path of Object.keys(module_sets)) {
            const modules = module_sets[package_path];
            log_verbose(`modules for package path '${package_path}':\n${JSON.stringify(modules, null, 2)}`);
            const moduleHierarchy = reduceModules(modules);
            log_verbose(`mapping hierarchy for package path '${package_path}':\n${JSON.stringify(moduleHierarchy)}`);
            // Process each root branch concurrently
            links.push(...moduleHierarchy.map(m => linkModules(package_path, m)));
        }
        let code = 0;
        yield Promise.all(links).catch(e => {
            log_error(e);
            code = 1;
        });
        return code;
    });
}
exports.main = main;
if (require.main === module) {
    if (Number(process.versions.node.split('.')[0]) < 10) {
        console.error(`ERROR: rules_nodejs linker requires Node v10 or greater, but is running on ${process.versions.node}`);
        console.error('Note that earlier Node versions are no longer in long-term-support, see');
        console.error('https://nodejs.org/en/about/releases/');
        process.exit(1);
    }
    (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            process.exitCode = yield main(process.argv.slice(2), _defaultRunfiles);
        }
        catch (e) {
            log_error(e);
            process.exitCode = 1;
        }
    }))();
}

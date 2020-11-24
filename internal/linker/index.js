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
const fs = require("fs");
const path = require("path");
const VERBOSE_LOGS = !!process.env['VERBOSE_LOGS'];
const BAZEL_OUT_REGEX = /(\/bazel-out\/|\/bazel-~1\/x64_wi~1\/)/;
function log_verbose(...m) {
    if (VERBOSE_LOGS)
        console.error('[link_node_modules.js]', ...m);
}
function log_error(error) {
    console.error('[link_node_modules.js] An error has been reported:', error, error.stack);
}
function panic(m) {
    throw new Error(`Internal error! Please run again with
   --define=VERBOSE_LOG=1
and file an issue: https://github.com/bazelbuild/rules_nodejs/issues/new?template=bug_report.md
Include as much of the build output as you can without disclosing anything confidential.

  Error:
  ${m}
  `);
}
function mkdirp(p) {
    return __awaiter(this, void 0, void 0, function* () {
        if (p && !(yield exists(p))) {
            yield mkdirp(path.dirname(p));
            log_verbose(`mkdir( ${p} )`);
            try {
                yield fs.promises.mkdir(p);
            }
            catch (e) {
                if (e.code !== 'EEXIST') {
                    throw e;
                }
            }
        }
    });
}
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
function deleteDirectory(p) {
    return __awaiter(this, void 0, void 0, function* () {
        log_verbose("Deleting children of", p);
        for (let entry of yield fs.promises.readdir(p)) {
            const childPath = path.join(p, entry);
            const stat = yield gracefulLstat(childPath);
            if (stat === null) {
                throw Error(`File does not exist, but is listed as directory entry: ${childPath}`);
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
        log_verbose(`symlink( ${p} -> ${target} )`);
        if (!(yield exists(target))) {
            return false;
        }
        try {
            yield fs.promises.symlink(target, p, 'junction');
            return true;
        }
        catch (e) {
            if (e.code !== 'EEXIST') {
                throw e;
            }
            if (VERBOSE_LOGS) {
                if (!(yield exists(p))) {
                    log_verbose('ERROR\n***\nLooks like we created a bad symlink:' +
                        `\n  pwd ${process.cwd()}\n  target ${target}\n  path ${p}\n***`);
                }
            }
            return false;
        }
    });
}
function resolveRoot(root, startCwd, isExecroot, runfiles) {
    return __awaiter(this, void 0, void 0, function* () {
        if (isExecroot) {
            return root ? `${startCwd}/external/${root}` : `${startCwd}/node_modules`;
        }
        const match = startCwd.match(BAZEL_OUT_REGEX);
        if (!match) {
            if (!root) {
                return `${startCwd}/node_modules`;
            }
            return path.resolve(`${startCwd}/../${root}`);
        }
        const symlinkRoot = startCwd.slice(0, match.index);
        process.chdir(symlinkRoot);
        if (!root) {
            return `${symlinkRoot}/node_modules`;
        }
        const fromManifest = runfiles.lookupDirectory(root);
        if (fromManifest) {
            return fromManifest;
        }
        else {
            const maybe = path.resolve(`${symlinkRoot}/external/${root}`);
            if (fs.existsSync(maybe)) {
                return maybe;
            }
            return path.resolve(`${startCwd}/../${root}`);
        }
    });
}
class Runfiles {
    constructor(env) {
        if (!!env['RUNFILES_MANIFEST_FILE']) {
            this.manifest = this.loadRunfilesManifest(env['RUNFILES_MANIFEST_FILE']);
        }
        else if (!!env['RUNFILES_DIR']) {
            this.dir = path.resolve(env['RUNFILES_DIR']);
        }
        else {
            panic('Every node program run under Bazel must have a $RUNFILES_DIR or $RUNFILES_MANIFEST_FILE environment variable');
        }
        if (env['RUNFILES_MANIFEST_ONLY'] === '1' && !env['RUNFILES_MANIFEST_FILE']) {
            log_verbose(`Workaround https://github.com/bazelbuild/bazel/issues/7994
                 RUNFILES_MANIFEST_FILE should have been set but wasn't.
                 falling back to using runfiles symlinks.
                 If you want to test runfiles manifest behavior, add
                 --spawn_strategy=standalone to the command line.`);
        }
        this.workspace = env['BAZEL_WORKSPACE'] || undefined;
        const target = env['BAZEL_TARGET'];
        if (!!target && !target.startsWith('@')) {
            this.package = target.split(':')[0].replace(/^\/\//, '');
        }
    }
    lookupDirectory(dir) {
        if (!this.manifest)
            return undefined;
        let result;
        for (const [k, v] of this.manifest) {
            if (k.startsWith(`${dir}/external`))
                continue;
            if (k.startsWith(dir)) {
                const l = k.length - dir.length;
                const maybe = v.substring(0, v.length - l);
                if (maybe.match(BAZEL_OUT_REGEX)) {
                    return maybe;
                }
                else {
                    result = maybe;
                }
            }
        }
        return result;
    }
    loadRunfilesManifest(manifestPath) {
        log_verbose(`using runfiles manifest ${manifestPath}`);
        const runfilesEntries = new Map();
        const input = fs.readFileSync(manifestPath, { encoding: 'utf-8' });
        for (const line of input.split('\n')) {
            if (!line)
                continue;
            const [runfilesPath, realPath] = line.split(' ');
            runfilesEntries.set(runfilesPath, realPath);
        }
        return runfilesEntries;
    }
    resolve(modulePath) {
        if (path.isAbsolute(modulePath)) {
            return modulePath;
        }
        const result = this._resolve(modulePath, undefined);
        if (result) {
            return result;
        }
        const e = new Error(`could not resolve modulePath ${modulePath}`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    }
    _resolve(moduleBase, moduleTail) {
        if (this.manifest) {
            const result = this.lookupDirectory(moduleBase);
            if (result) {
                if (moduleTail) {
                    const maybe = path.join(result, moduleTail || '');
                    if (fs.existsSync(maybe)) {
                        return maybe;
                    }
                }
                else {
                    return result;
                }
            }
        }
        if (exports.runfiles.dir) {
            const maybe = path.join(exports.runfiles.dir, moduleBase, moduleTail || '');
            if (fs.existsSync(maybe)) {
                return maybe;
            }
        }
        const dirname = path.dirname(moduleBase);
        if (dirname == '.') {
            return undefined;
        }
        return this._resolve(dirname, path.join(path.basename(moduleBase), moduleTail || ''));
    }
    resolveWorkspaceRelative(modulePath) {
        if (!this.workspace) {
            throw new Error('workspace could not be determined from the environment; make sure BAZEL_WORKSPACE is set');
        }
        return this.resolve(path.posix.join(this.workspace, modulePath));
    }
    resolvePackageRelative(modulePath) {
        if (!this.workspace) {
            throw new Error('workspace could not be determined from the environment; make sure BAZEL_WORKSPACE is set');
        }
        if (this.package === undefined) {
            throw new Error('package could not be determined from the environment; make sure BAZEL_TARGET is set');
        }
        return this.resolve(path.posix.join(this.workspace, this.package, modulePath));
    }
    patchRequire() {
        const requirePatch = process.env['BAZEL_NODE_PATCH_REQUIRE'];
        if (!requirePatch) {
            throw new Error('require patch location could not be determined from the environment');
        }
        require(requirePatch);
    }
}
exports.Runfiles = Runfiles;
function exists(p) {
    return __awaiter(this, void 0, void 0, function* () {
        return ((yield gracefulLstat(p)) !== null);
    });
}
function existsSync(p) {
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
    if (link && allElementsAlignUnder(name, link, children)) {
        return { name, link };
    }
    return element;
}
function toParentLink(link) {
    return [link[0], path.dirname(link[1])];
}
function allElementsAlign(name, elements) {
    if (!elements[0].link) {
        return false;
    }
    const parentLink = toParentLink(elements[0].link);
    if (!elements.every(e => !!e.link && isDirectChildLink(parentLink, e.link))) {
        return false;
    }
    return !!elements[0].link && allElementsAlignUnder(name, parentLink, elements);
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
function isDirectChildLink([parentRel, parentPath], [childRel, childPath]) {
    if (parentRel !== childRel) {
        return false;
    }
    if (!isDirectChildPath(parentPath, childPath)) {
        return false;
    }
    return true;
}
function isNameLinkPathTopAligned(namePath, [, linkPath]) {
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
function main(args, runfiles) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!args || args.length < 1)
            throw new Error('requires one argument: modulesManifest path');
        const [modulesManifest] = args;
        let { bin, root, modules, workspace } = JSON.parse(fs.readFileSync(modulesManifest));
        modules = modules || {};
        log_verbose('manifest file', modulesManifest);
        log_verbose('manifest contents', JSON.stringify({ workspace, bin, root, modules }, null, 2));
        const startCwd = process.cwd().replace(/\\/g, '/');
        log_verbose('startCwd', startCwd);
        const isExecroot = existsSync(`${startCwd}/bazel-out`);
        log_verbose('isExecroot', isExecroot.toString());
        const rootDir = yield resolveRoot(root, startCwd, isExecroot, runfiles);
        log_verbose('resolved node_modules root', root, 'to', rootDir);
        log_verbose('cwd', process.cwd());
        if (!(yield exists(rootDir))) {
            log_verbose('no third-party packages; mkdir node_modules at', root);
            yield mkdirp(rootDir);
        }
        yield symlink(rootDir, 'node_modules');
        process.chdir(rootDir);
        function isLeftoverDirectoryFromLinker(stats, modulePath) {
            return __awaiter(this, void 0, void 0, function* () {
                if (runfiles.manifest === undefined) {
                    return false;
                }
                if (!stats.isDirectory()) {
                    return false;
                }
                let isLeftoverFromPreviousLink = true;
                yield visitDirectoryPreserveLinks(modulePath, (childPath, childStats) => __awaiter(this, void 0, void 0, function* () {
                    if (!childStats.isSymbolicLink()) {
                        isLeftoverFromPreviousLink = false;
                    }
                }));
                return isLeftoverFromPreviousLink;
            });
        }
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
        function linkModules(m) {
            return __awaiter(this, void 0, void 0, function* () {
                yield mkdirp(path.dirname(m.name));
                if (m.link) {
                    const [root, modulePath] = m.link;
                    let target = '<package linking failed>';
                    switch (root) {
                        case 'execroot':
                            if (isExecroot) {
                                target = `${startCwd}/${modulePath}`;
                                break;
                            }
                        case 'runfiles':
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
                                runfilesPath = `${workspace}/${runfilesPath}`;
                            }
                            try {
                                target = runfiles.resolve(runfilesPath);
                                if (runfiles.manifest && root == 'execroot' && modulePath.startsWith(`${bin}/`)) {
                                    if (!target.includes(`/${bin}/`)) {
                                        const e = new Error(`could not resolve modulePath ${modulePath}`);
                                        e.code = 'MODULE_NOT_FOUND';
                                        throw e;
                                    }
                                }
                            }
                            catch (_a) {
                                target = '<runfiles resolution failed>';
                            }
                            break;
                    }
                    const stats = yield gracefulLstat(m.name);
                    if (stats !== null && (yield isLeftoverDirectoryFromLinker(stats, m.name))) {
                        yield createSymlinkAndPreserveContents(stats, m.name, target);
                    }
                    else {
                        yield symlink(target, m.name);
                    }
                }
                if (m.children) {
                    yield Promise.all(m.children.map(linkModules));
                }
            });
        }
        const moduleHierarchy = reduceModules(modules);
        log_verbose(`mapping hierarchy ${JSON.stringify(moduleHierarchy)}`);
        const links = moduleHierarchy.map(linkModules);
        let code = 0;
        yield Promise.all(links).catch(e => {
            log_error(e);
            code = 1;
        });
        return code;
    });
}
exports.main = main;
exports.runfiles = new Runfiles(process.env);
if (require.main === module) {
    (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            process.exitCode = yield main(process.argv.slice(2), exports.runfiles);
        }
        catch (e) {
            log_error(e);
            process.exitCode = 1;
        }
    }))();
}

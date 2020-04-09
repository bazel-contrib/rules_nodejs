/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("build_bazel_rules_nodejs/internal/linker/link_node_modules", ["require", "exports", "fs", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @fileoverview Creates a node_modules directory in the current working directory
     * and symlinks in the node modules needed to run a program.
     * This replaces the need for custom module resolution logic inside the process.
     */
    const fs = require("fs");
    const path = require("path");
    // Run Bazel with --define=VERBOSE_LOGS=1 to enable this logging
    const VERBOSE_LOGS = !!process.env['VERBOSE_LOGS'];
    function log_verbose(...m) {
        if (VERBOSE_LOGS)
            console.error('[link_node_modules.js]', ...m);
    }
    function log_error(...m) {
        console.error('[link_node_modules.js]', ...m);
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
    /**
     * Create a new directory and any necessary subdirectories
     * if they do not exist.
     */
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
                        // can happen if path being created exists via a symlink
                        throw e;
                    }
                }
            }
        });
    }
    function symlink(target, p) {
        return __awaiter(this, void 0, void 0, function* () {
            log_verbose(`symlink( ${p} -> ${target} )`);
            // Check if the target exists before creating the symlink.
            // This is an extra filesystem access on top of the symlink but
            // it is necessary for the time being.
            if (!(yield exists(target))) {
                // This can happen if a module mapping is propogated from a dependency
                // but the targat that generated the mapping in not in the deps. We don't
                // want to create symlinks to non-existant targets as this will
                // break any nested symlinks that may be created under the module name
                // after this.
                return false;
            }
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
    /**
     * Resolve to an absolute root node_modules directory.
     * @param root The bazel managed node_modules root such as 'npm/node_modules',  which includes the
     * workspace name as the first segment. May be undefined if there are no third_party node_modules
     * deps.
     * @param startCwd The absolute path that bazel started the action at.
     * @param isExecroot True if the action is run in the execroot, false if the action is run in
     * runfiles root.
     * @param runfiles The runfiles helper object.
     * @return The absolute path on disk where node_modules was installed or if no third party
     * node_modules are deps of the current target the returns the absolute path to
     * `execroot/my_wksp/node_modules`.
     */
    function resolveRoot(root, startCwd, isExecroot, runfiles) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isExecroot) {
                // Under execroot, the root will be under an external folder from the startCwd
                // `execroot/my_wksp`. For example, `execroot/my_wksp/external/npm/node_modules`. If there is no
                // root, which will be the case if there are no third-party modules dependencies for this
                // target, set the root to `execroot/my_wksp/node_modules`.
                return root ? `${startCwd}/external/${root}` : `${startCwd}/node_modules`;
            }
            // Under runfiles, the linker should symlink node_modules at `execroot/my_wksp`
            // so that when there are no runfiles (default on Windows) and scripts run out of
            // `execroot/my_wksp` they can resolve node_modules with standard node_module resolution
            // Look for bazel-out which is used to determine the the path to `execroot/my_wksp`. This works in
            // all cases including on rbe where the execroot is a path such as `/b/f/w`. For example, when in
            // runfiles on rbe, bazel runs the process in a directory such as
            // `/b/f/w/bazel-out/k8-fastbuild/bin/path/to/pkg/some_test.sh.runfiles/my_wksp`. From here we can
            // determine the execroot `b/f/w` by finding the first instance of bazel-out.
            const match = startCwd.match(/\/bazel-out\//);
            if (!match) {
                panic(`No 'bazel-out' folder found in path '${startCwd}'!`);
                return '';
            }
            const symlinkRoot = startCwd.slice(0, match.index);
            process.chdir(symlinkRoot);
            if (!root) {
                // If there is no root, which will be the case if there are no third-party modules dependencies
                // for this target, set the root to `execroot/my_wksp/node_modules`.
                return `${symlinkRoot}/node_modules`;
            }
            // If we got a runfilesManifest map, look through it for a resolution
            // This will happen if we are running a binary that had some npm packages
            // "statically linked" into its runfiles
            const fromManifest = runfiles.lookupDirectory(root);
            if (fromManifest) {
                return fromManifest;
            }
            else {
                // Under runfiles, the root will be one folder up from the startCwd `runfiles/my_wksp`.
                // This is true whether legacy external runfiles are on or off.
                return path.resolve(`${startCwd}/../${root}`);
            }
        });
    }
    class Runfiles {
        constructor(env) {
            // If Bazel sets a variable pointing to a runfiles manifest,
            // we'll always use it.
            // Note that this has a slight performance implication on Mac/Linux
            // where we could use the runfiles tree already laid out on disk
            // but this just costs one file read for the external npm/node_modules
            // and one for each first-party module, not one per file.
            if (!!env['RUNFILES_MANIFEST_FILE']) {
                this.manifest = this.loadRunfilesManifest(env['RUNFILES_MANIFEST_FILE']);
            }
            else if (!!env['RUNFILES_DIR']) {
                this.dir = path.resolve(env['RUNFILES_DIR']);
            }
            else {
                panic('Every node program run under Bazel must have a $RUNFILES_DIR or $RUNFILES_MANIFEST_FILE environment variable');
            }
            // Under --noenable_runfiles (in particular on Windows)
            // Bazel sets RUNFILES_MANIFEST_ONLY=1.
            // When this happens, we need to read the manifest file to locate
            // inputs
            if (env['RUNFILES_MANIFEST_ONLY'] === '1' && !env['RUNFILES_MANIFEST_FILE']) {
                log_verbose(`Workaround https://github.com/bazelbuild/bazel/issues/7994
                 RUNFILES_MANIFEST_FILE should have been set but wasn't.
                 falling back to using runfiles symlinks.
                 If you want to test runfiles manifest behavior, add
                 --spawn_strategy=standalone to the command line.`);
            }
            // Bazel starts actions with pwd=execroot/my_wksp or pwd=runfiles/my_wksp
            this.workspace = env['BAZEL_WORKSPACE'] || undefined;
            // If target is from an external workspace such as @npm//rollup/bin:rollup
            // resolvePackageRelative is not supported since package is in an external
            // workspace.
            const target = env['BAZEL_TARGET'];
            if (!!target && !target.startsWith('@')) {
                // //path/to:target -> path/to
                this.package = target.split(':')[0].replace(/^\/\//, '');
            }
        }
        lookupDirectory(dir) {
            if (!this.manifest)
                return undefined;
            for (const [k, v] of this.manifest) {
                // Account for Bazel --legacy_external_runfiles
                // which pollutes the workspace with 'my_wksp/external/...'
                if (k.startsWith(`${dir}/external`))
                    continue;
                // Entry looks like
                // k: npm/node_modules/semver/LICENSE
                // v: /path/to/external/npm/node_modules/semver/LICENSE
                // calculate l = length(`/semver/LICENSE`)
                if (k.startsWith(dir)) {
                    const l = k.length - dir.length;
                    return v.substring(0, v.length - l);
                }
            }
        }
        /**
         * The runfiles manifest maps from short_path
         * https://docs.bazel.build/versions/master/skylark/lib/File.html#short_path
         * to the actual location on disk where the file can be read.
         *
         * In a sandboxed execution, it does not exist. In that case, runfiles must be
         * resolved from a symlink tree under the runfiles dir.
         * See https://github.com/bazelbuild/bazel/issues/3726
         */
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
            // Look in the runfiles first
            if (this.manifest) {
                return this.lookupDirectory(modulePath);
            }
            if (exports.runfiles.dir) {
                return path.join(exports.runfiles.dir, modulePath);
            }
            throw new Error(`could not resolve modulePath ${modulePath}`);
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
            // NB: this.package may be '' if at the root of the workspace
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
    // There is no fs.promises.exists function because
    // node core is of the opinion that exists is always too racey to rely on.
    function exists(p) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs.promises.stat(p);
                return true;
            }
            catch (e) {
                if (e.code === 'ENOENT') {
                    return false;
                }
                throw e;
            }
        });
    }
    function existsSync(p) {
        try {
            fs.statSync(p);
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
        // No link but all child elements have aligning links
        // => the link can be lifted to here
        if (!link && allElementsAlign(name, children)) {
            return {
                name,
                link: toParentLink(children[0].link),
            };
        }
        // Only a single child and this element is just a directory (no link) => only need the child link
        // Do this last only after trying to lift child links up
        if (children.length === 1 && !link) {
            return children[0];
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
        // Every child needs a link with aligning parents
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
        // Ensure same link-relation type
        if (parentRel !== childRel) {
            return false;
        }
        // Ensure child path is a direct-child of the parent path
        if (!isDirectChildPath(parentPath, childPath)) {
            return false;
        }
        return true;
    }
    function isNameLinkPathTopAligned(namePath, [, linkPath]) {
        return path.basename(namePath) === path.basename(linkPath);
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
            // Bazel starts actions with pwd=execroot/my_wksp when under execroot or pwd=runfiles/my_wksp
            // when under runfiles.
            // Normalize the slashes in startCwd for easier matching and manipulation.
            const startCwd = process.cwd().replace(/\\/g, '/');
            log_verbose('startCwd', startCwd);
            // We can derive if the process is being run in the execroot if there is a bazel-out folder.
            const isExecroot = existsSync(`${startCwd}/bazel-out`);
            log_verbose('isExecroot', isExecroot.toString());
            // NB: resolveRoot will change the cwd when under runfiles to `execroot/my_wksp`
            const rootDir = yield resolveRoot(root, startCwd, isExecroot, runfiles);
            log_verbose('resolved node_modules root', root, 'to', rootDir);
            log_verbose('cwd', process.cwd());
            // Create rootDir if it does not exists. This will be the case if there are no third-party deps
            // for this target or if outside of the sandbox and there are no node_modules installed.
            if (!(yield exists(rootDir))) {
                log_verbose('no third-party packages; mkdir node_modules at ', root);
                yield fs.promises.mkdir(rootDir);
            }
            // Create the node_modules symlink to the node_modules root that node will resolve from
            yield symlink(rootDir, 'node_modules');
            // Change directory to the node_modules root directory so that all subsequent
            // symlinks will be created under node_modules
            process.chdir(rootDir);
            function linkModules(m) {
                return __awaiter(this, void 0, void 0, function* () {
                    // ensure the parent directory exist
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
                            // If under runfiles, the fall through to 'runfiles' case
                            // so that we handle case where there is only a MANIFEST file
                            case 'runfiles':
                                // Transform execroot path to the runfiles manifest path so that
                                // it can be resolved with runfiles.resolve()
                                let runfilesPath = modulePath;
                                if (runfilesPath.startsWith(`${bin}/`)) {
                                    runfilesPath = runfilesPath.slice(bin.length + 1);
                                }
                                const externalPrefix = 'external/';
                                if (runfilesPath.startsWith(externalPrefix)) {
                                    runfilesPath = runfilesPath.slice(externalPrefix.length);
                                }
                                else {
                                    runfilesPath = `${workspace}/${runfilesPath}`;
                                }
                                target = runfiles.resolve(runfilesPath) || '<runfiles resolution failed>';
                                break;
                        }
                        yield symlink(target, m.name);
                    }
                    // Process each child branch concurrently
                    if (m.children) {
                        yield Promise.all(m.children.map(linkModules));
                    }
                });
            }
            const moduleHeirarchy = reduceModules(modules);
            log_verbose(`mapping hierarchy ${JSON.stringify(moduleHeirarchy)}`);
            // Process each root branch concurrently
            const links = moduleHeirarchy.map(linkModules);
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
});

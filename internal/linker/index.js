/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
    function symlink(target, path) {
        return __awaiter(this, void 0, void 0, function* () {
            log_verbose(`symlink( ${path} -> ${target} )`);
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
                yield fs.promises.symlink(target, path, 'junction');
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
                    if (!(yield exists(path))) {
                        log_verbose('ERROR\n***\nLooks like we created a bad symlink:' +
                            `\n  pwd ${process.cwd()}\n  target ${target}\n  path ${path}\n***`);
                    }
                }
                return false;
            }
        });
    }
    /**
     * Resolve a root directory string to the actual location on disk
     * where node_modules was installed
     * @param root a string like 'npm/node_modules'
     */
    function resolveRoot(root, runfiles) {
        return __awaiter(this, void 0, void 0, function* () {
            // create a node_modules directory if no root
            // this will be the case if only first-party modules are installed
            if (!root) {
                if (!(yield exists('node_modules'))) {
                    log_verbose('no third-party packages; mkdir node_modules in ', process.cwd());
                    yield fs.promises.mkdir('node_modules');
                }
                return 'node_modules';
            }
            // If we got a runfilesManifest map, look through it for a resolution
            // This will happen if we are running a binary that had some npm packages
            // "statically linked" into its runfiles
            const fromManifest = runfiles.lookupDirectory(root);
            if (fromManifest)
                return fromManifest;
            // Account for Bazel --legacy_external_runfiles
            // which look like 'my_wksp/external/npm/node_modules'
            if (yield exists(path.join('external', root))) {
                log_verbose('found legacy_external_runfiles, switching root to', path.join('external', root));
                return path.join('external', root);
            }
            // The repository should be layed out in the parent directory
            // since bazel sets our working directory to the repository where the build is happening
            return path.join('..', root);
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
            const wksp = env['TEST_WORKSPACE'];
            const target = env['TEST_TARGET'];
            if (!!wksp && !!target) {
                // //path/to:target -> //path/to
                const pkg = target.split(':')[0];
                this.packagePath = path.posix.join(wksp, pkg);
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
        resolvePackageRelative(modulePath) {
            if (!this.packagePath) {
                throw new Error('packagePath could not be determined from the environment');
            }
            return this.resolve(path.posix.join(this.packagePath, modulePath));
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
    function groupAndReduceModules(modules) {
        // Group nested modules names as these need to be symlinked in order.
        // For example, given a list of module keys such as:
        // ['a', '@foo/c/c/c/c', 'b/b', 'b', '@foo/c', '@foo/c/c']
        // this reducer should output the groups list:
        // [ [ '@foo/c', '@foo/c/c', '@foo/c/c/c/c' ], [ 'a' ], [ 'b', 'b/b' ] ]
        const grouped = Object.keys(modules).sort().reduce((grouped, module, index, array) => {
            if (index > 0 && module.startsWith(`${array[index - 1]}/`)) {
                grouped[grouped.length - 1].push(module);
            }
            else {
                grouped.push([module]);
            }
            return grouped;
        }, []);
        // Reduce links such as `@foo/b/c => /path/to/a/b/c` to their
        // lowest common denominator `@foo => /path/to/a` & then remove
        // duplicates.
        return grouped.map(group => {
            return group
                .map(name => {
                let [kind, modulePath] = modules[name];
                for (;;) {
                    const bn = path.basename(name);
                    const bmp = path.basename(modulePath);
                    if (bn == bmp && bn !== name && bmp !== modulePath) {
                        // strip off the last segment as it is common
                        name = path.dirname(name);
                        modulePath = path.dirname(modulePath);
                        log_verbose(`module mapping ( ${name}/${bn} => ${modulePath}/${bmp} ) reduced to ( ${name} => ${modulePath} )`);
                    }
                    else {
                        break;
                    }
                }
                return { name, root: kind, modulePath };
            })
                .reduce((result, current) => {
                if (result.length > 0) {
                    const last = result[result.length - 1];
                    if (current.name === last.name && current.modulePath === last.modulePath) {
                        // duplicate mapping after reduction
                        if (current.root !== last.root) {
                            throw new Error(`conflicting module mappings for '${last.name}' => '${last.modulePath}' of kind '${last.root}' and '${current.root}'`);
                        }
                        return result;
                    }
                }
                result.push(current);
                return result;
            }, []);
        });
    }
    exports.groupAndReduceModules = groupAndReduceModules;
    function main(args, runfiles) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!args || args.length < 1)
                throw new Error('requires one argument: modulesManifest path');
            const [modulesManifest] = args;
            let { bin, root, modules, workspace } = JSON.parse(fs.readFileSync(modulesManifest));
            modules = modules || {};
            log_verbose(`module manifest: workspace ${workspace}, bin ${bin}, root ${root} with first-party packages\n`, modules);
            const rootDir = yield resolveRoot(root, runfiles);
            log_verbose('resolved root', root, 'to', rootDir);
            log_verbose('cwd', process.cwd());
            // Bazel starts actions with pwd=execroot/my_wksp
            const workspaceDir = path.resolve('.');
            // Convert from runfiles path
            // this_wksp/path/to/file OR other_wksp/path/to/file
            // to execroot path
            // path/to/file OR external/other_wksp/path/to/file
            function toWorkspaceDir(p) {
                if (p === workspace) {
                    return '.';
                }
                // The manifest is written with forward slash on all platforms
                if (p.startsWith(workspace + '/')) {
                    return p.substring(workspace.length + 1);
                }
                return path.join('external', p);
            }
            // Create the $pwd/node_modules directory that node will resolve from
            yield symlink(rootDir, 'node_modules');
            process.chdir(rootDir);
            // Symlinks to packages need to reach back to the workspace/runfiles directory
            const workspaceAbs = path.resolve(workspaceDir);
            // Now add symlinks to each of our first-party packages so they appear under the node_modules tree
            const links = [];
            function linkModules(modules) {
                return __awaiter(this, void 0, void 0, function* () {
                    for (const m of modules) {
                        let target = '<package linking failed>';
                        switch (m.root) {
                            case 'bin':
                                // FIXME(#1196)
                                target = path.join(workspaceAbs, bin, toWorkspaceDir(m.modulePath));
                                break;
                            case 'src':
                                target = path.join(workspaceAbs, toWorkspaceDir(m.modulePath));
                                break;
                            case 'runfiles':
                                target = runfiles.resolve(m.modulePath) || '<runfiles resolution failed>';
                                break;
                        }
                        // ensure the subdirectories exist
                        yield mkdirp(path.dirname(m.name));
                        yield symlink(target, m.name);
                    }
                });
            }
            const groupedMappings = groupAndReduceModules(modules);
            log_verbose(`grouped mappings ${JSON.stringify(groupedMappings)}`);
            for (const mappings of groupedMappings) {
                // ensure that common directories between groups exists
                // to prevent race conditions between parallelized linkModules
                yield mkdirp(path.dirname(mappings[0].name));
                // call linkModules for each group
                links.push(linkModules(mappings));
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
    exports.runfiles = new Runfiles(process.env);
    if (require.main === module) {
        (() => __awaiter(this, void 0, void 0, function* () {
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

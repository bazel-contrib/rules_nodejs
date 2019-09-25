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
    function panic(m) {
        throw new Error(`Internal error! Please run again with
   --define=VERBOSE_LOG=1
and file an issue: https://github.com/bazelbuild/rules_nodejs/issues/new?template=bug_report.md
Include as much of the build output as you can without disclosing anything confidential.

  Error:
  ${m}
  `);
    }
    function symlink(target, path) {
        return __awaiter(this, void 0, void 0, function* () {
            log_verbose(`symlink( ${path} -> ${target} )`);
            // Use junction on Windows since symlinks require elevated permissions.
            // We only link to directories so junctions work for us.
            try {
                yield fs.promises.symlink(target, path, 'junction');
            }
            catch (e) {
                if (e.code !== 'EEXIST') {
                    throw e;
                }
                // We assume here that the path is already linked to the correct target.
                // Could add some logic that asserts it here, but we want to avoid an extra
                // filesystem access so we should only do it under some kind of strict mode.
            }
            if (VERBOSE_LOGS) {
                // Be verbose about creating a bad symlink
                // Maybe this should fail in production as well, but again we want to avoid
                // any unneeded file I/O
                if (!fs.existsSync(path)) {
                    log_verbose('ERROR\n***\nLooks like we created a bad symlink:' +
                        `\n  pwd ${process.cwd()}\n  target ${target}\n***`);
                }
            }
        });
    }
    /**
     * Resolve a root directory string to the actual location on disk
     * where node_modules was installed
     * @param root a string like 'npm/node_modules'
     */
    function resolveRoot(root, runfiles) {
        // create a node_modules directory if no root
        // this will be the case if only first-party modules are installed
        if (!root) {
            if (!fs.existsSync('node_modules')) {
                log_verbose('no third-party packages; mkdir node_modules in ', process.cwd());
                fs.mkdirSync('node_modules');
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
        if (fs.existsSync(path.join('external', root))) {
            log_verbose('Found legacy_external_runfiles, switching root to', path.join('external', root));
            return path.join('external', root);
        }
        // The repository should be layed out in the parent directory
        // since bazel sets our working directory to the repository where the build is happening
        return path.join('..', root);
    }
    class Runfiles {
        constructor() {
            // If Bazel sets a variable pointing to a runfiles manifest,
            // we'll always use it.
            // Note that this has a slight performance implication on Mac/Linux
            // where we could use the runfiles tree already laid out on disk
            // but this just costs one file read for the external npm/node_modules
            // and one for each first-party module, not one per file.
            if (!!process.env['RUNFILES_MANIFEST_FILE']) {
                this.manifest = this.loadRunfilesManifest(process.env['RUNFILES_MANIFEST_FILE']);
            }
            else if (!!process.env['RUNFILES_DIR']) {
                this.dir = path.resolve(process.env['RUNFILES_DIR']);
            }
            else {
                panic('Every node program run under Bazel must have a $RUNFILES_DIR or $RUNFILES_MANIFEST_FILE environment variable');
            }
            // Under --noenable_runfiles (in particular on Windows)
            // Bazel sets RUNFILES_MANIFEST_ONLY=1.
            // When this happens, we need to read the manifest file to locate
            // inputs
            if (process.env['RUNFILES_MANIFEST_ONLY'] === '1' && !process.env['RUNFILES_MANIFEST_FILE']) {
                log_verbose(`Workaround https://github.com/bazelbuild/bazel/issues/7994
                 RUNFILES_MANIFEST_FILE should have been set but wasn't.
                 falling back to using runfiles symlinks.
                 If you want to test runfiles manifest behavior, add
                 --spawn_strategy=standalone to the command line.`);
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
        resolve(...modulePath) {
            // Look in the runfiles first
            if (this.manifest) {
                return this.lookupDirectory(path.join(...modulePath));
            }
            // how can we avoid this FS lookup every time? we don't know when process.cwd changed...
            //const runfilesRelative = runfiles.dir ? path.relative('.', runfiles.dir) : undefined;
            if (exports.runfiles.dir) {
                return path.join(exports.runfiles.dir, ...modulePath);
            }
            throw new Error(`could not resolve modulePath ${modulePath}`);
        }
    }
    exports.Runfiles = Runfiles;
    exports.runfiles = new Runfiles();
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
    function main(args, runfiles) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!args || args.length < 1)
                throw new Error('link_node_modules.js requires one argument: modulesManifest path');
            const [modulesManifest] = args;
            let { bin, root, modules, workspace } = JSON.parse(fs.readFileSync(modulesManifest));
            modules = modules || {};
            log_verbose(`module manifest: workspace ${workspace}, bin ${bin}, root ${root} with first-party packages\n`, modules);
            const rootDir = resolveRoot(root, runfiles);
            log_verbose('resolved root', root, 'to', rootDir);
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
            const workspaceRelative = path.relative('.', workspaceDir);
            // Now add symlinks to each of our first-party packages so they appear under the node_modules tree
            const links = [];
            const linkModule = (name, modulePath) => __awaiter(this, void 0, void 0, function* () {
                let target = runfiles.resolve(modulePath);
                // It sucks that we have to do a FS call here.
                // TODO: could we know which packages are statically linked??
                if (!target || !(yield exists(target))) {
                    // Try the bin dir
                    target = path.join(workspaceRelative, bin, toWorkspaceDir(modulePath));
                    if (!(yield exists(target))) {
                        // Try the execroot
                        target = path.join(workspaceRelative, toWorkspaceDir(modulePath));
                    }
                }
                yield symlink(target, name);
            });
            for (const m of Object.keys(modules)) {
                links.push(linkModule(m, modules[m]));
            }
            yield Promise.all(links);
            return 0;
        });
    }
    exports.main = main;
    if (require.main === module) {
        (() => __awaiter(this, void 0, void 0, function* () {
            process.exitCode = yield main(process.argv.slice(2), new Runfiles());
        }))();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua19ub2RlX21vZHVsZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC9saW5rZXIvbGlua19ub2RlX21vZHVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFBOzs7O09BSUc7SUFDSCx5QkFBeUI7SUFDekIsNkJBQTZCO0lBRTdCLGdFQUFnRTtJQUNoRSxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUVuRCxTQUFTLFdBQVcsQ0FBQyxHQUFHLENBQVc7UUFDakMsSUFBSSxZQUFZO1lBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxTQUFTLEtBQUssQ0FBQyxDQUFTO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUM7Ozs7OztJQU1kLENBQUM7R0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBZSxPQUFPLENBQUMsTUFBYyxFQUFFLElBQVk7O1lBQ2pELFdBQVcsQ0FBQyxZQUFZLElBQUksT0FBTyxNQUFNLElBQUksQ0FBQyxDQUFDO1lBQy9DLHVFQUF1RTtZQUN2RSx3REFBd0Q7WUFDeEQsSUFBSTtnQkFDRixNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7YUFDckQ7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO29CQUN2QixNQUFNLENBQUMsQ0FBQztpQkFDVDtnQkFDRCx3RUFBd0U7Z0JBQ3hFLDJFQUEyRTtnQkFDM0UsNEVBQTRFO2FBQzdFO1lBRUQsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLDBDQUEwQztnQkFDMUMsMkVBQTJFO2dCQUMzRSx3QkFBd0I7Z0JBQ3hC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dmlldyBDcmVhdGVzIGEgbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSBpbiB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeVxuICogYW5kIHN5bWxpbmtzIGluIHRoZSBub2RlIG1vZHVsZXMgbmVlZGVkIHRvIHJ1biBhIHByb2dyYW0uXG4gKiBUaGlzIHJlcGxhY2VzIHRoZSBuZWVkIGZvciBjdXN0b20gbW9kdWxlIHJlc29sdXRpb24gbG9naWMgaW5zaWRlIHRoZSBwcm9jZXNzLlxuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG4vLyBSdW4gQmF6ZWwgd2l0aCAtLWRlZmluZT1WRVJCT1NFX0xPR1M9MSB0byBlbmFibGUgdGhpcyBsb2dnaW5nXG5jb25zdCBWRVJCT1NFX0xPR1MgPSAhIXByb2Nlc3MuZW52WydWRVJCT1NFX0xPR1MnXTtcblxuZnVuY3Rpb24gbG9nX3ZlcmJvc2UoLi4ubTogc3RyaW5nW10pIHtcbiAgaWYgKFZFUkJPU0VfTE9HUykgY29uc29sZS5lcnJvcignW2xpbmtfbm9kZV9tb2R1bGVzLmpzXScsIC4uLm0pO1xufVxuXG5mdW5jdGlvbiBwYW5pYyhtOiBzdHJpbmcpIHtcbiAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcm5hbCBlcnJvciEgUGxlYXNlIHJ1biBhZ2FpbiB3aXRoXG4gICAtLWRlZmluZT1WRVJCT1NFX0xPRz0xXG5hbmQgZmlsZSBhbiBpc3N1ZTogaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy9uZXc/dGVtcGxhdGU9YnVnX3JlcG9ydC5tZFxuSW5jbHVkZSBhcyBtdWNoIG9mIHRoZSBidWlsZCBvdXRwdXQgYXMgeW91IGNhbiB3aXRob3V0IGRpc2Nsb3NpbmcgYW55dGhpbmcgY29uZmlkZW50aWFsLlxuXG4gIEVycm9yOlxuICAke219XG4gIGApO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzeW1saW5rKHRhcmdldDogc3RyaW5nLCBwYXRoOiBzdHJpbmcpIHtcbiAgbG9nX3ZlcmJvc2UoYHN5bWxpbmsoICR7cGF0aH0gLT4gJHt0YXJnZXR9IClgKTtcbiAgLy8gVXNlIGp1bmN0aW9uIG9uIFdpbmRvd3Mgc2luY2Ugc3ltbGlua3MgcmVxdWlyZSBlbGV2YXRlZCBwZXJtaXNzaW9ucy5cbiAgLy8gV2Ugb25seSBsaW5rIHRvIGRpcmVjdG9yaWVzIHNvIGp1bmN0aW9ucyB3b3JrIGZvciB1cy5cbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5wcm9taXNlcy5zeW1saW5rKHRhcmdldCwgcGF0aCwgJ2p1bmN0aW9uJyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoZS5jb2RlICE9PSAnRUVYSVNUJykge1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gICAgLy8gV2UgYXNzdW1lIGhlcmUgdGhhdCB0aGUgcGF0aCBpcyBhbHJlYWR5IGxpbmtlZCB0byB0aGUgY29ycmVjdCB0YXJnZXQuXG4gICAgLy8gQ291bGQgYWRkIHNvbWUgbG9naWMgdGhhdCBhc3NlcnRzIGl0IGhlcmUsIGJ1dCB3ZSB3YW50IHRvIGF2b2lkIGFuIGV4dHJhXG4gICAgLy8gZmlsZXN5c3RlbSBhY2Nlc3Mgc28gd2Ugc2hvdWxkIG9ubHkgZG8gaXQgdW5kZXIgc29tZSBraW5kIG9mIHN0cmljdCBtb2RlLlxuICB9XG5cbiAgaWYgKFZFUkJPU0VfTE9HUykge1xuICAgIC8vIEJlIHZlcmJvc2UgYWJvdXQgY3JlYXRpbmcgYSBiYWQgc3ltbGlua1xuICAgIC8vIE1heWJlIHRoaXMgc2hvdWxkIGZhaWwgaW4gcHJvZHVjdGlvbiBhcyB3ZWxsLCBidXQgYWdhaW4gd2Ugd2FudCB0byBhdm9pZFxuICAgIC8vIGFueSB1bm5lZWRlZCBmaWxlIEkvT1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhwYXRoKSkge1xuICAgICAgbG9nX3ZlcmJvc2UoXG4gICAgICAgICAgJ0VSUk9SXFxuKioqXFxuTG9va3MgbGlrZSB3ZSBjcmVhdGVkIGEgYmFkIHN5bWxpbms6JyArXG4gICAgICAgICAgYFxcbiAgcHdkICR7cHJvY2Vzcy5jd2QoKX1cXG4gIHRhcmdldCAke3RhcmdldH1cXG4qKipgKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgcm9vdCBkaXJlY3Rvcnkgc3RyaW5nIHRvIHRoZSBhY3R1YWwgbG9jYXRpb24gb24gZGlza1xuICogd2hlcmUgbm9kZV9tb2R1bGVzIHdhcyBpbnN0YWxsZWRcbiAqIEBwYXJhbSByb290IGEgc3RyaW5nIGxpa2UgJ25wbS9ub2RlX21vZHVsZXMnXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVSb290KHJvb3Q6IHN0cmluZ3x1bmRlZmluZWQsIHJ1bmZpbGVzOiBSdW5maWxlcykge1xuICAvLyBjcmVhdGUgYSBub2RlX21vZHVsZXMgZGlyZWN0b3J5IGlmIG5vIHJvb3RcbiAgLy8gdGhpcyB3aWxsIGJlIHRoZSBjYXNlIGlmIG9ubHkgZmlyc3QtcGFydHkgbW9kdWxlcyBhcmUgaW5zdGFsbGVkXG4gIGlmICghcm9vdCkge1xuICAgIGlmICghZnMuZXhpc3RzU3luYygnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgIGxvZ192ZXJib3NlKCdubyB0aGlyZC1wYXJ0eSBwYWNrYWdlczsgbWtkaXIgbm9kZV9tb2R1bGVzIGluICcsIHByb2Nlc3MuY3dkKCkpO1xuICAgICAgZnMubWtkaXJTeW5jKCdub2RlX21vZHVsZXMnKTtcbiAgICB9XG4gICAgcmV0dXJuICdub2RlX21vZHVsZXMnO1xuICB9XG5cbiAgLy8gSWYgd2UgZ290IGEgcnVuZmlsZXNNYW5pZmVzdCBtYXAsIGxvb2sgdGhyb3VnaCBpdCBmb3IgYSByZXNvbHV0aW9uXG4gIC8vIFRoaXMgd2lsbCBoYXBwZW4gaWYgd2UgYXJlIHJ1bm5pbmcgYSBiaW5hcnkgdGhhdCBoYWQgc29tZSBucG0gcGFja2FnZXNcbiAgLy8gXCJzdGF0aWNhbGx5IGxpbmtlZFwiIGludG8gaXRzIHJ1bmZpbGVzXG4gIGNvbnN0IGZyb21NYW5pZmVzdCA9IHJ1bmZpbGVzLmxvb2t1cERpcmVjdG9yeShyb290KTtcbiAgaWYgKGZyb21NYW5pZmVzdCkgcmV0dXJuIGZyb21NYW5pZmVzdDtcblxuICAvLyBBY2NvdW50IGZvciBCYXplbCAtLWxlZ2FjeV9leHRlcm5hbF9ydW5maWxlc1xuICAvLyB3aGljaCBsb29rIGxpa2UgJ215X3drc3AvZXh0ZXJuYWwvbnBtL25vZGVfbW9kdWxlcydcbiAgaWYgKGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKCdleHRlcm5hbCcsIHJvb3QpKSkge1xuICAgIGxvZ192ZXJib3NlKCdGb3VuZCBsZWdhY3lfZXh0ZXJuYWxfcnVuZmlsZXMsIHN3aXRjaGluZyByb290IHRvJywgcGF0aC5qb2luKCdleHRlcm5hbCcsIHJvb3QpKTtcbiAgICByZXR1cm4gcGF0aC5qb2luKCdleHRlcm5hbCcsIHJvb3QpO1xuICB9XG5cbiAgLy8gVGhlIHJlcG9zaXRvcnkgc2hvdWxkIGJlIGxheWVkIG91dCBpbiB0aGUgcGFyZW50IGRpcmVjdG9yeVxuICAvLyBzaW5jZSBiYXplbCBzZXRzIG91ciB3b3JraW5nIGRpcmVjdG9yeSB0byB0aGUgcmVwb3NpdG9yeSB3aGVyZSB0aGUgYnVpbGQgaXMgaGFwcGVuaW5nXG4gIHJldHVybiBwYXRoLmpvaW4oJy4uJywgcm9vdCk7XG59XG5cbmV4cG9ydCBjbGFzcyBSdW5maWxlcyB7XG4gIG1hbmlmZXN0OiBNYXA8c3RyaW5nLCBzdHJpbmc+fHVuZGVmaW5lZDtcbiAgZGlyOiBzdHJpbmd8dW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIC8vIElmIEJhemVsIHNldHMgYSB2YXJpYWJsZSBwb2ludGluZyB0byBhIHJ1bmZpbGVzIG1hbmlmZXN0LFxuICAgIC8vIHdlJ2xsIGFsd2F5cyB1c2UgaXQuXG4gICAgLy8gTm90ZSB0aGF0IHRoaXMgaGFzIGEgc2xpZ2h0IHBlcmZvcm1hbmNlIGltcGxpY2F0aW9uIG9uIE1hYy9MaW51eFxuICAgIC8vIHdoZXJlIHdlIGNvdWxkIHVzZSB0aGUgcnVuZmlsZXMgdHJlZSBhbHJlYWR5IGxhaWQgb3V0IG9uIGRpc2tcbiAgICAvLyBidXQgdGhpcyBqdXN0IGNvc3RzIG9uZSBmaWxlIHJlYWQgZm9yIHRoZSBleHRlcm5hbCBucG0vbm9kZV9tb2R1bGVzXG4gICAgLy8gYW5kIG9uZSBmb3IgZWFjaCBmaXJzdC1wYXJ0eSBtb2R1bGUsIG5vdCBvbmUgcGVyIGZpbGUuXG4gICAgaWYgKCEhcHJvY2Vzcy5lbnZbJ1JVTkZJTEVTX01BTklGRVNUX0ZJTEUnXSkge1xuICAgICAgdGhpcy5tYW5pZmVzdCA9IHRoaXMubG9hZFJ1bmZpbGVzTWFuaWZlc3QocHJvY2Vzcy5lbnZbJ1JVTkZJTEVTX01BTklGRVNUX0ZJTEUnXSEpO1xuICAgIH0gZWxzZSBpZiAoISFwcm9jZXNzLmVudlsnUlVORklMRVNfRElSJ10pIHtcbiAgICAgIHRoaXMuZGlyID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuZW52WydSVU5GSUxFU19ESVInXSEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYW5pYyhcbiAgICAgICAgICAnRXZlcnkgbm9kZSBwcm9ncmFtIHJ1biB1bmRlciBCYXplbCBtdXN0IGhhdmUgYSAkUlVORklMRVNfRElSIG9yICRSVU5GSUxFU19NQU5JRkVTVF9GSUxFIGVudmlyb25tZW50IHZhcmlhYmxlJyk7XG4gICAgfVxuICAgIC8vIFVuZGVyIC0tbm9lbmFibGVfcnVuZmlsZXMgKGluIHBhcnRpY3VsYXIgb24gV2luZG93cylcbiAgICAvLyBCYXplbCBzZXRzIFJVTkZJTEVTX01BTklGRVNUX09OTFk9MS5cbiAgICAvLyBXaGVuIHRoaXMgaGFwcGVucywgd2UgbmVlZCB0byByZWFkIHRoZSBtYW5pZmVzdCBmaWxlIHRvIGxvY2F0ZVxuICAgIC8vIGlucHV0c1xuICAgIGlmIChwcm9jZXNzLmVudlsnUlVORklMRVNfTUFOSUZFU1RfT05MWSddID09PSAnMScgJiYgIXByb2Nlc3MuZW52WydSVU5GSUxFU19NQU5JRkVTVF9GSUxFJ10pIHtcbiAgICAgIGxvZ192ZXJib3NlKGBXb3JrYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL2JhemVsL2lzc3Vlcy83OTk0XG4gICAgICAgICAgICAgICAgIFJVTkZJTEVTX01BTklGRVNUX0ZJTEUgc2hvdWxkIGhhdmUgYmVlbiBzZXQgYnV0IHdhc24ndC5cbiAgICAgICAgICAgICAgICAgZmFsbGluZyBiYWNrIHRvIHVzaW5nIHJ1bmZpbGVzIHN5bWxpbmtzLlxuICAgICAgICAgICAgICAgICBJZiB5b3Ugd2FudCB0byB0ZXN0IHJ1bmZpbGVzIG1hbmlmZXN0IGJlaGF2aW9yLCBhZGRcbiAgICAgICAgICAgICAgICAgLS1zcGF3bl9zdHJhdGVneT1zdGFuZGFsb25lIHRvIHRoZSBjb21tYW5kIGxpbmUuYCk7XG4gICAgfVxuICB9XG5cbiAgbG9va3VwRGlyZWN0b3J5KGRpcjogc3RyaW5nKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLm1hbmlmZXN0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgdGhpcy5tYW5pZmVzdCkge1xuICAgICAgLy8gQWNjb3VudCBmb3IgQmF6ZWwgLS1sZWdhY3lfZXh0ZXJuYWxfcnVuZmlsZXNcbiAgICAgIC8vIHdoaWNoIHBvbGx1dGVzIHRoZSB3b3Jrc3BhY2Ugd2l0aCAnbXlfd2tzcC9leHRlcm5hbC8uLi4nXG4gICAgICBpZiAoay5zdGFydHNXaXRoKGAke2Rpcn0vZXh0ZXJuYWxgKSkgY29udGludWU7XG5cbiAgICAgIC8vIEVudHJ5IGxvb2tzIGxpa2VcbiAgICAgIC8vIGs6IG5wbS9ub2RlX21vZHVsZXMvc2VtdmVyL0xJQ0VOU0VcbiAgICAgIC8vIHY6IC9wYXRoL3RvL2V4dGVybmFsL25wbS9ub2RlX21vZHVsZXMvc2VtdmVyL0xJQ0VOU0VcbiAgICAgIC8vIGNhbGN1bGF0ZSBsID0gbGVuZ3RoKGAvc2VtdmVyL0xJQ0VOU0VgKVxuICAgICAgaWYgKGsuc3RhcnRzV2l0aChkaXIpKSB7XG4gICAgICAgIGNvbnN0IGwgPSBrLmxlbmd0aCAtIGRpci5sZW5ndGg7XG4gICAgICAgIHJldHVybiB2LnN1YnN0cmluZygwLCB2Lmxlbmd0aCAtIGwpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqIFRoZSBydW5maWxlcyBtYW5pZmVzdCBtYXBzIGZyb20gc2hvcnRfcGF0aFxuICAgKiBodHRwczovL2RvY3MuYmF6ZWwuYnVpbGQvdmVyc2lvbnMvbWFzdGVyL3NreWxhcmsvbGliL0ZpbGUuaHRtbCNzaG9ydF9wYXRoXG4gICAqIHRvIHRoZSBhY3R1YWwgbG9jYXRpb24gb24gZGlzayB3aGVyZSB0aGUgZmlsZSBjYW4gYmUgcmVhZC5cbiAgICpcbiAgICogSW4gYSBzYW5kYm94ZWQgZXhlY3V0aW9uLCBpdCBkb2VzIG5vdCBleGlzdC4gSW4gdGhhdCBjYXNlLCBydW5maWxlcyBtdXN0IGJlXG4gICAqIHJlc29sdmVkIGZyb20gYSBzeW1saW5rIHRyZWUgdW5kZXIgdGhlIHJ1bmZpbGVzIGRpci5cbiAgICogU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL2JhemVsL2lzc3Vlcy8zNzI2XG4gICAqL1xuICBsb2FkUnVuZmlsZXNNYW5pZmVzdChtYW5pZmVzdFBhdGg6IHN0cmluZykge1xuICAgIGxvZ192ZXJib3NlKGB1c2luZyBydW5maWxlcyBtYW5pZmVzdCAke21hbmlmZXN0UGF0aH1gKTtcblxuICAgIGNvbnN0IHJ1bmZpbGVzRW50cmllcyA9IG5ldyBNYXAoKTtcbiAgICBjb25zdCBpbnB1dCA9IGZzLnJlYWRGaWxlU3luYyhtYW5pZmVzdFBhdGgsIHtlbmNvZGluZzogJ3V0Zi04J30pO1xuXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGlucHV0LnNwbGl0KCdcXG4nKSkge1xuICAgICAgaWYgKCFsaW5lKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IFtydW5maWxlc1BhdGgsIHJlYWxQYXRoXSA9IGxpbmUuc3BsaXQoJyAnKTtcbiAgICAgIHJ1bmZpbGVzRW50cmllcy5zZXQocnVuZmlsZXNQYXRoLCByZWFsUGF0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ1bmZpbGVzRW50cmllcztcbiAgfVxuXG4gIHJlc29sdmUoLi4ubW9kdWxlUGF0aDogc3RyaW5nW10pIHsgICAgXG4gICAgLy8gTG9vayBpbiB0aGUgcnVuZmlsZXMgZmlyc3RcbiAgICBpZiAodGhpcy5tYW5pZmVzdCkge1xuICAgICAgcmV0dXJuIHRoaXMubG9va3VwRGlyZWN0b3J5KHBhdGguam9pbiguLi5tb2R1bGVQYXRoKSk7XG4gICAgfVxuICAgIC8vIGhvdyBjYW4gd2UgYXZvaWQgdGhpcyBGUyBsb29rdXAgZXZlcnkgdGltZT8gd2UgZG9uJ3Qga25vdyB3aGVuIHByb2Nlc3MuY3dkIGNoYW5nZWQuLi5cbiAgICAvL2NvbnN0IHJ1bmZpbGVzUmVsYXRpdmUgPSBydW5maWxlcy5kaXIgPyBwYXRoLnJlbGF0aXZlKCcuJywgcnVuZmlsZXMuZGlyKSA6IHVuZGVmaW5lZDtcbiAgICBcbiAgICBpZiAocnVuZmlsZXMuZGlyKSB7XG4gICAgICByZXR1cm4gcGF0aC5qb2luKHJ1bmZpbGVzLmRpciwgLi4ubW9kdWxlUGF0aCk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgY291bGQgbm90IHJlc29sdmUgbW9kdWxlUGF0aCAke21vZHVsZVBhdGh9YCk7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IHJ1bmZpbGVzID0gbmV3IFJ1bmZpbGVzKCk7XG5cbi8vIFR5cGVTY3JpcHQgbGliLmVzNS5kLnRzIGhhcyBhIG1pc3Rha2U6IEpTT04ucGFyc2UgZG9lcyBhY2NlcHQgQnVmZmVyLlxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgSlNPTiB7XG4gICAgcGFyc2UoYjoge3RvU3RyaW5nOiAoKSA9PiBzdHJpbmd9KTogYW55O1xuICB9XG59XG5cbi8vIFRoZXJlIGlzIG5vIGZzLnByb21pc2VzLmV4aXN0cyBmdW5jdGlvbiBiZWNhdXNlXG4vLyBub2RlIGNvcmUgaXMgb2YgdGhlIG9waW5pb24gdGhhdCBleGlzdHMgaXMgYWx3YXlzIHRvbyByYWNleSB0byByZWx5IG9uLlxuYXN5bmMgZnVuY3Rpb24gZXhpc3RzKHA6IHN0cmluZykge1xuICB0cnkge1xuICAgIGF3YWl0IGZzLnByb21pc2VzLnN0YXQocClcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1haW4oYXJnczogc3RyaW5nW10sIHJ1bmZpbGVzOiBSdW5maWxlcykge1xuICBpZiAoIWFyZ3MgfHwgYXJncy5sZW5ndGggPCAxKVxuICAgIHRocm93IG5ldyBFcnJvcignbGlua19ub2RlX21vZHVsZXMuanMgcmVxdWlyZXMgb25lIGFyZ3VtZW50OiBtb2R1bGVzTWFuaWZlc3QgcGF0aCcpO1xuXG4gIGNvbnN0IFttb2R1bGVzTWFuaWZlc3RdID0gYXJncztcbiAgbGV0IHtiaW4sIHJvb3QsIG1vZHVsZXMsIHdvcmtzcGFjZX0gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhtb2R1bGVzTWFuaWZlc3QpKTtcbiAgbW9kdWxlcyA9IG1vZHVsZXMgfHwge307XG4gIGxvZ192ZXJib3NlKFxuICAgICAgYG1vZHVsZSBtYW5pZmVzdDogd29ya3NwYWNlICR7d29ya3NwYWNlfSwgYmluICR7YmlufSwgcm9vdCAke1xuICAgICAgICAgIHJvb3R9IHdpdGggZmlyc3QtcGFydHkgcGFja2FnZXNcXG5gLFxuICAgICAgbW9kdWxlcyk7XG5cbiAgY29uc3Qgcm9vdERpciA9IHJlc29sdmVSb290KHJvb3QsIHJ1bmZpbGVzKTtcbiAgbG9nX3ZlcmJvc2UoJ3Jlc29sdmVkIHJvb3QnLCByb290LCAndG8nLCByb290RGlyKTtcblxuICAvLyBCYXplbCBzdGFydHMgYWN0aW9ucyB3aXRoIHB3ZD1leGVjcm9vdC9teV93a3NwXG4gIGNvbnN0IHdvcmtzcGFjZURpciA9IHBhdGgucmVzb2x2ZSgnLicpO1xuXG4gIC8vIENvbnZlcnQgZnJvbSBydW5maWxlcyBwYXRoXG4gIC8vIHRoaXNfd2tzcC9wYXRoL3RvL2ZpbGUgT1Igb3RoZXJfd2tzcC9wYXRoL3RvL2ZpbGVcbiAgLy8gdG8gZXhlY3Jvb3QgcGF0aFxuICAvLyBwYXRoL3RvL2ZpbGUgT1IgZXh0ZXJuYWwvb3RoZXJfd2tzcC9wYXRoL3RvL2ZpbGVcbiAgZnVuY3Rpb24gdG9Xb3Jrc3BhY2VEaXIocDogc3RyaW5nKSB7XG4gICAgaWYgKHAgPT09IHdvcmtzcGFjZSkge1xuICAgICAgcmV0dXJuICcuJztcbiAgICB9XG4gICAgLy8gVGhlIG1hbmlmZXN0IGlzIHdyaXR0ZW4gd2l0aCBmb3J3YXJkIHNsYXNoIG9uIGFsbCBwbGF0Zm9ybXNcbiAgICBpZiAocC5zdGFydHNXaXRoKHdvcmtzcGFjZSArICcvJykpIHtcbiAgICAgIHJldHVybiBwLnN1YnN0cmluZyh3b3Jrc3BhY2UubGVuZ3RoICsgMSk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcCk7XG4gIH1cblxuICAvLyBDcmVhdGUgdGhlICRwd2Qvbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSB0aGF0IG5vZGUgd2lsbCByZXNvbHZlIGZyb21cbiAgYXdhaXQgc3ltbGluayhyb290RGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gIHByb2Nlc3MuY2hkaXIocm9vdERpcik7XG5cbiAgLy8gU3ltbGlua3MgdG8gcGFja2FnZXMgbmVlZCB0byByZWFjaCBiYWNrIHRvIHRoZSB3b3Jrc3BhY2UvcnVuZmlsZXMgZGlyZWN0b3J5XG4gIGNvbnN0IHdvcmtzcGFjZVJlbGF0aXZlID0gcGF0aC5yZWxhdGl2ZSgnLicsIHdvcmtzcGFjZURpcik7XG5cbiAgLy8gTm93IGFkZCBzeW1saW5rcyB0byBlYWNoIG9mIG91ciBmaXJzdC1wYXJ0eSBwYWNrYWdlcyBzbyB0aGV5IGFwcGVhciB1bmRlciB0aGUgbm9kZV9tb2R1bGVzIHRyZWVcbiAgY29uc3QgbGlua3MgPSBbXTtcblxuICBjb25zdCBsaW5rTW9kdWxlID1cbiAgICAgIGFzeW5jIChuYW1lOiBzdHJpbmcsIG1vZHVsZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIGxldCB0YXJnZXQgPSBydW5maWxlcy5yZXNvbHZlKG1vZHVsZVBhdGgpO1xuXG4gICAgLy8gSXQgc3Vja3MgdGhhdCB3ZSBoYXZlIHRvIGRvIGEgRlMgY2FsbCBoZXJlLlxuICAgIC8vIFRPRE86IGNvdWxkIHdlIGtub3cgd2hpY2ggcGFja2FnZXMgYXJlIHN0YXRpY2FsbHkgbGlua2VkPz9cbiAgICBpZiAoIXRhcmdldCB8fCAhYXdhaXQgZXhpc3RzKHRhcmdldCkpIHtcbiAgICAgIC8vIFRyeSB0aGUgYmluIGRpclxuICAgICAgdGFyZ2V0ID0gcGF0aC5qb2luKHdvcmtzcGFjZVJlbGF0aXZlLCBiaW4sIHRvV29ya3NwYWNlRGlyKG1vZHVsZVBhdGgpKTtcbiAgICAgIGlmICghYXdhaXQgZXhpc3RzKHRhcmdldCkpIHtcbiAgICAgICAgLy8gVHJ5IHRoZSBleGVjcm9vdFxuICAgICAgICB0YXJnZXQgPSBwYXRoLmpvaW4od29ya3NwYWNlUmVsYXRpdmUsIHRvV29ya3NwYWNlRGlyKG1vZHVsZVBhdGgpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCBzeW1saW5rKHRhcmdldCwgbmFtZSk7XG4gIH1cblxuICBmb3IgKGNvbnN0IG0gb2YgT2JqZWN0LmtleXMobW9kdWxlcykpIHtcbiAgICBsaW5rcy5wdXNoKGxpbmtNb2R1bGUobSwgbW9kdWxlc1ttXSkpO1xuICB9XG5cbiAgYXdhaXQgUHJvbWlzZS5hbGwobGlua3MpO1xuXG4gIHJldHVybiAwO1xufVxuXG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgKGFzeW5jICgpID0+IHtcbiAgICBwcm9jZXNzLmV4aXRDb2RlID0gYXdhaXQgbWFpbihwcm9jZXNzLmFyZ3Yuc2xpY2UoMiksIG5ldyBSdW5maWxlcygpKTtcbiAgfSkoKTtcbn1cbiJdfQ==
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
    /**
     * Create a new directory and any necessary subdirectories
     * if they do not exist.
     */
    function mkdirp(p) {
        if (!fs.existsSync(p)) {
            mkdirp(path.dirname(p));
            fs.mkdirSync(p);
        }
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
                        `\n  pwd ${process.cwd()}\n  target ${target}\n  path ${path}\n***`);
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
            const workspaceAbs = path.resolve(workspaceDir);
            // Now add symlinks to each of our first-party packages so they appear under the node_modules tree
            const links = [];
            const linkModule = (name, root, modulePath) => __awaiter(this, void 0, void 0, function* () {
                let target = '<package linking failed>';
                switch (root) {
                    case 'bin':
                        // FIXME(#1196)
                        target = path.join(workspaceAbs, bin, toWorkspaceDir(modulePath));
                        break;
                    case 'src':
                        target = path.join(workspaceAbs, toWorkspaceDir(modulePath));
                        break;
                    case 'runfiles':
                        target = runfiles.resolve(modulePath) || '<runfiles resolution failed>';
                        break;
                }
                yield symlink(target, name);
            });
            for (const m of Object.keys(modules)) {
                const segments = m.split('/');
                if (segments.length > 2) {
                    throw new Error(`module ${m} has more than 2 segments which is not a valid node module name`);
                }
                if (segments.length == 2) {
                    // ensure the scope exists
                    mkdirp(segments[0]);
                }
                const [kind, modulePath] = modules[m];
                links.push(linkModule(m, kind, modulePath));
            }
            let code = 0;
            yield Promise.all(links).catch(e => {
                console.error(e);
                code = 1;
            });
            return code;
        });
    }
    exports.main = main;
    exports.runfiles = new Runfiles(process.env);
    if (require.main === module) {
        (() => __awaiter(this, void 0, void 0, function* () {
            process.exitCode = yield main(process.argv.slice(2), exports.runfiles);
        }))();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua19ub2RlX21vZHVsZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC9saW5rZXIvbGlua19ub2RlX21vZHVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFBOzs7O09BSUc7SUFDSCx5QkFBeUI7SUFDekIsNkJBQTZCO0lBRTdCLGdFQUFnRTtJQUNoRSxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUVuRCxTQUFTLFdBQVcsQ0FBQyxHQUFHLENBQVc7UUFDakMsSUFBSSxZQUFZO1lBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxTQUFTLEtBQUssQ0FBQyxDQUFTO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUM7Ozs7OztJQU1kLENBQUM7R0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBUyxNQUFNLENBQUMsQ0FBUztRQUN2QixJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNyQixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakI7SUFDSCxDQUFDO0lBRUQsU0FBZSxPQUFPLENBQUMsTUFBYyxFQUFFLElBQVk7O1lBQ2pELFdBQVcsQ0FBQyxZQUFZLElBQUksT0FBTyxNQUFNLElBQUksQ0FBQyxDQUFDO1lBQy9DLHVFQUF1RTtZQUN2RSx3REFBd0Q7WUFDeEQsSUFBSTtnQkFDRixNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7YUFDckQ7WUFB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QUU7WUFDVixPQUFPLENBQUMsUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLGdCQUFRLENBQUMsQ0FBQztRQUNqRSxDQUFDLENBQUEsQ0FBQyxFQUFFLENBQUM7S0FDTiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGVvdmVydmlldyBDcmVhdGVzIGEgbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSBpbiB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeVxuICogYW5kIHN5bWxpbmtzIGluIHRoZSBub2RlIG1vZHVsZXMgbmVlZGVkIHRvIHJ1biBhIHByb2dyYW0uXG4gKiBUaGlzIHJlcGxhY2VzIHRoZSBuZWVkIGZvciBjdXN0b20gbW9kdWxlIHJlc29sdXRpb24gbG9naWMgaW5zaWRlIHRoZSBwcm9jZXNzLlxuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG4vLyBSdW4gQmF6ZWwgd2l0aCAtLWRlZmluZT1WRVJCT1NFX0xPR1M9MSB0byBlbmFibGUgdGhpcyBsb2dnaW5nXG5jb25zdCBWRVJCT1NFX0xPR1MgPSAhIXByb2Nlc3MuZW52WydWRVJCT1NFX0xPR1MnXTtcblxuZnVuY3Rpb24gbG9nX3ZlcmJvc2UoLi4ubTogc3RyaW5nW10pIHtcbiAgaWYgKFZFUkJPU0VfTE9HUykgY29uc29sZS5lcnJvcignW2xpbmtfbm9kZV9tb2R1bGVzLmpzXScsIC4uLm0pO1xufVxuXG5mdW5jdGlvbiBwYW5pYyhtOiBzdHJpbmcpIHtcbiAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcm5hbCBlcnJvciEgUGxlYXNlIHJ1biBhZ2FpbiB3aXRoXG4gICAtLWRlZmluZT1WRVJCT1NFX0xPRz0xXG5hbmQgZmlsZSBhbiBpc3N1ZTogaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy9uZXc/dGVtcGxhdGU9YnVnX3JlcG9ydC5tZFxuSW5jbHVkZSBhcyBtdWNoIG9mIHRoZSBidWlsZCBvdXRwdXQgYXMgeW91IGNhbiB3aXRob3V0IGRpc2Nsb3NpbmcgYW55dGhpbmcgY29uZmlkZW50aWFsLlxuXG4gIEVycm9yOlxuICAke219XG4gIGApO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBkaXJlY3RvcnkgYW5kIGFueSBuZWNlc3Nhcnkgc3ViZGlyZWN0b3JpZXNcbiAqIGlmIHRoZXkgZG8gbm90IGV4aXN0LlxuICovXG5mdW5jdGlvbiBta2RpcnAocDogc3RyaW5nKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhwKSkge1xuICAgIG1rZGlycChwYXRoLmRpcm5hbWUocCkpO1xuICAgIGZzLm1rZGlyU3luYyhwKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBzeW1saW5rKHRhcmdldDogc3RyaW5nLCBwYXRoOiBzdHJpbmcpIHtcbiAgbG9nX3ZlcmJvc2UoYHN5bWxpbmsoICR7cGF0aH0gLT4gJHt0YXJnZXR9IClgKTtcbiAgLy8gVXNlIGp1bmN0aW9uIG9uIFdpbmRvd3Mgc2luY2Ugc3ltbGlua3MgcmVxdWlyZSBlbGV2YXRlZCBwZXJtaXNzaW9ucy5cbiAgLy8gV2Ugb25seSBsaW5rIHRvIGRpcmVjdG9yaWVzIHNvIGp1bmN0aW9ucyB3b3JrIGZvciB1cy5cbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5wcm9taXNlcy5zeW1saW5rKHRhcmdldCwgcGF0aCwgJ2p1bmN0aW9uJyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoZS5jb2RlICE9PSAnRUVYSVNUJykge1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gICAgLy8gV2UgYXNzdW1lIGhlcmUgdGhhdCB0aGUgcGF0aCBpcyBhbHJlYWR5IGxpbmtlZCB0byB0aGUgY29ycmVjdCB0YXJnZXQuXG4gICAgLy8gQ291bGQgYWRkIHNvbWUgbG9naWMgdGhhdCBhc3NlcnRzIGl0IGhlcmUsIGJ1dCB3ZSB3YW50IHRvIGF2b2lkIGFuIGV4dHJhXG4gICAgLy8gZmlsZXN5c3RlbSBhY2Nlc3Mgc28gd2Ugc2hvdWxkIG9ubHkgZG8gaXQgdW5kZXIgc29tZSBraW5kIG9mIHN0cmljdCBtb2RlLlxuICB9XG5cbiAgaWYgKFZFUkJPU0VfTE9HUykge1xuICAgIC8vIEJlIHZlcmJvc2UgYWJvdXQgY3JlYXRpbmcgYSBiYWQgc3ltbGlua1xuICAgIC8vIE1heWJlIHRoaXMgc2hvdWxkIGZhaWwgaW4gcHJvZHVjdGlvbiBhcyB3ZWxsLCBidXQgYWdhaW4gd2Ugd2FudCB0byBhdm9pZFxuICAgIC8vIGFueSB1bm5lZWRlZCBmaWxlIEkvT1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhwYXRoKSkge1xuICAgICAgbG9nX3ZlcmJvc2UoXG4gICAgICAgICAgJ0VSUk9SXFxuKioqXFxuTG9va3MgbGlrZSB3ZSBjcmVhdGVkIGEgYmFkIHN5bWxpbms6JyArXG4gICAgICAgICAgYFxcbiAgcHdkICR7cHJvY2Vzcy5jd2QoKX1cXG4gIHRhcmdldCAke3RhcmdldH1cXG4gIHBhdGggJHtwYXRofVxcbioqKmApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJlc29sdmUgYSByb290IGRpcmVjdG9yeSBzdHJpbmcgdG8gdGhlIGFjdHVhbCBsb2NhdGlvbiBvbiBkaXNrXG4gKiB3aGVyZSBub2RlX21vZHVsZXMgd2FzIGluc3RhbGxlZFxuICogQHBhcmFtIHJvb3QgYSBzdHJpbmcgbGlrZSAnbnBtL25vZGVfbW9kdWxlcydcbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVJvb3Qocm9vdDogc3RyaW5nfHVuZGVmaW5lZCwgcnVuZmlsZXM6IFJ1bmZpbGVzKSB7XG4gIC8vIGNyZWF0ZSBhIG5vZGVfbW9kdWxlcyBkaXJlY3RvcnkgaWYgbm8gcm9vdFxuICAvLyB0aGlzIHdpbGwgYmUgdGhlIGNhc2UgaWYgb25seSBmaXJzdC1wYXJ0eSBtb2R1bGVzIGFyZSBpbnN0YWxsZWRcbiAgaWYgKCFyb290KSB7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgbG9nX3ZlcmJvc2UoJ25vIHRoaXJkLXBhcnR5IHBhY2thZ2VzOyBta2RpciBub2RlX21vZHVsZXMgaW4gJywgcHJvY2Vzcy5jd2QoKSk7XG4gICAgICBmcy5ta2RpclN5bmMoJ25vZGVfbW9kdWxlcycpO1xuICAgIH1cbiAgICByZXR1cm4gJ25vZGVfbW9kdWxlcyc7XG4gIH1cblxuICAvLyBJZiB3ZSBnb3QgYSBydW5maWxlc01hbmlmZXN0IG1hcCwgbG9vayB0aHJvdWdoIGl0IGZvciBhIHJlc29sdXRpb25cbiAgLy8gVGhpcyB3aWxsIGhhcHBlbiBpZiB3ZSBhcmUgcnVubmluZyBhIGJpbmFyeSB0aGF0IGhhZCBzb21lIG5wbSBwYWNrYWdlc1xuICAvLyBcInN0YXRpY2FsbHkgbGlua2VkXCIgaW50byBpdHMgcnVuZmlsZXNcbiAgY29uc3QgZnJvbU1hbmlmZXN0ID0gcnVuZmlsZXMubG9va3VwRGlyZWN0b3J5KHJvb3QpO1xuICBpZiAoZnJvbU1hbmlmZXN0KSByZXR1cm4gZnJvbU1hbmlmZXN0O1xuXG4gIC8vIEFjY291bnQgZm9yIEJhemVsIC0tbGVnYWN5X2V4dGVybmFsX3J1bmZpbGVzXG4gIC8vIHdoaWNoIGxvb2sgbGlrZSAnbXlfd2tzcC9leHRlcm5hbC9ucG0vbm9kZV9tb2R1bGVzJ1xuICBpZiAoZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCkpKSB7XG4gICAgbG9nX3ZlcmJvc2UoJ0ZvdW5kIGxlZ2FjeV9leHRlcm5hbF9ydW5maWxlcywgc3dpdGNoaW5nIHJvb3QgdG8nLCBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCkpO1xuICAgIHJldHVybiBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCk7XG4gIH1cblxuICAvLyBUaGUgcmVwb3NpdG9yeSBzaG91bGQgYmUgbGF5ZWQgb3V0IGluIHRoZSBwYXJlbnQgZGlyZWN0b3J5XG4gIC8vIHNpbmNlIGJhemVsIHNldHMgb3VyIHdvcmtpbmcgZGlyZWN0b3J5IHRvIHRoZSByZXBvc2l0b3J5IHdoZXJlIHRoZSBidWlsZCBpcyBoYXBwZW5pbmdcbiAgcmV0dXJuIHBhdGguam9pbignLi4nLCByb290KTtcbn1cblxuZXhwb3J0IGNsYXNzIFJ1bmZpbGVzIHtcbiAgbWFuaWZlc3Q6IE1hcDxzdHJpbmcsIHN0cmluZz58dW5kZWZpbmVkO1xuICBkaXI6IHN0cmluZ3x1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBJZiB0aGUgZW52aXJvbm1lbnQgZ2l2ZXMgdXMgZW5vdWdoIGhpbnRzLCB3ZSBjYW4ga25vdyB0aGUgcGF0aCB0byB0aGUgcGFja2FnZVxuICAgKiBpbiB0aGUgZm9ybSB3b3Jrc3BhY2VfbmFtZS9wYXRoL3RvL3BhY2thZ2VcbiAgICovXG4gIHBhY2thZ2VQYXRoOiBzdHJpbmd8dW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKGVudjogdHlwZW9mIHByb2Nlc3MuZW52KSB7XG4gICAgLy8gSWYgQmF6ZWwgc2V0cyBhIHZhcmlhYmxlIHBvaW50aW5nIHRvIGEgcnVuZmlsZXMgbWFuaWZlc3QsXG4gICAgLy8gd2UnbGwgYWx3YXlzIHVzZSBpdC5cbiAgICAvLyBOb3RlIHRoYXQgdGhpcyBoYXMgYSBzbGlnaHQgcGVyZm9ybWFuY2UgaW1wbGljYXRpb24gb24gTWFjL0xpbnV4XG4gICAgLy8gd2hlcmUgd2UgY291bGQgdXNlIHRoZSBydW5maWxlcyB0cmVlIGFscmVhZHkgbGFpZCBvdXQgb24gZGlza1xuICAgIC8vIGJ1dCB0aGlzIGp1c3QgY29zdHMgb25lIGZpbGUgcmVhZCBmb3IgdGhlIGV4dGVybmFsIG5wbS9ub2RlX21vZHVsZXNcbiAgICAvLyBhbmQgb25lIGZvciBlYWNoIGZpcnN0LXBhcnR5IG1vZHVsZSwgbm90IG9uZSBwZXIgZmlsZS5cbiAgICBpZiAoISFlbnZbJ1JVTkZJTEVTX01BTklGRVNUX0ZJTEUnXSkge1xuICAgICAgdGhpcy5tYW5pZmVzdCA9IHRoaXMubG9hZFJ1bmZpbGVzTWFuaWZlc3QoZW52WydSVU5GSUxFU19NQU5JRkVTVF9GSUxFJ10hKTtcbiAgICB9IGVsc2UgaWYgKCEhZW52WydSVU5GSUxFU19ESVInXSkge1xuICAgICAgdGhpcy5kaXIgPSBwYXRoLnJlc29sdmUoZW52WydSVU5GSUxFU19ESVInXSEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYW5pYyhcbiAgICAgICAgICAnRXZlcnkgbm9kZSBwcm9ncmFtIHJ1biB1bmRlciBCYXplbCBtdXN0IGhhdmUgYSAkUlVORklMRVNfRElSIG9yICRSVU5GSUxFU19NQU5JRkVTVF9GSUxFIGVudmlyb25tZW50IHZhcmlhYmxlJyk7XG4gICAgfVxuICAgIC8vIFVuZGVyIC0tbm9lbmFibGVfcnVuZmlsZXMgKGluIHBhcnRpY3VsYXIgb24gV2luZG93cylcbiAgICAvLyBCYXplbCBzZXRzIFJVTkZJTEVTX01BTklGRVNUX09OTFk9MS5cbiAgICAvLyBXaGVuIHRoaXMgaGFwcGVucywgd2UgbmVlZCB0byByZWFkIHRoZSBtYW5pZmVzdCBmaWxlIHRvIGxvY2F0ZVxuICAgIC8vIGlucHV0c1xuICAgIGlmIChlbnZbJ1JVTkZJTEVTX01BTklGRVNUX09OTFknXSA9PT0gJzEnICYmICFlbnZbJ1JVTkZJTEVTX01BTklGRVNUX0ZJTEUnXSkge1xuICAgICAgbG9nX3ZlcmJvc2UoYFdvcmthcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvYmF6ZWwvaXNzdWVzLzc5OTRcbiAgICAgICAgICAgICAgICAgUlVORklMRVNfTUFOSUZFU1RfRklMRSBzaG91bGQgaGF2ZSBiZWVuIHNldCBidXQgd2Fzbid0LlxuICAgICAgICAgICAgICAgICBmYWxsaW5nIGJhY2sgdG8gdXNpbmcgcnVuZmlsZXMgc3ltbGlua3MuXG4gICAgICAgICAgICAgICAgIElmIHlvdSB3YW50IHRvIHRlc3QgcnVuZmlsZXMgbWFuaWZlc3QgYmVoYXZpb3IsIGFkZFxuICAgICAgICAgICAgICAgICAtLXNwYXduX3N0cmF0ZWd5PXN0YW5kYWxvbmUgdG8gdGhlIGNvbW1hbmQgbGluZS5gKTtcbiAgICB9XG5cbiAgICBjb25zdCB3a3NwID0gZW52WydURVNUX1dPUktTUEFDRSddO1xuICAgIGNvbnN0IHRhcmdldCA9IGVudlsnVEVTVF9UQVJHRVQnXTtcbiAgICBpZiAoISF3a3NwICYmICEhdGFyZ2V0KSB7XG4gICAgICAvLyAvL3BhdGgvdG86dGFyZ2V0IC0+IC8vcGF0aC90b1xuICAgICAgY29uc3QgcGtnID0gdGFyZ2V0LnNwbGl0KCc6JylbMF07XG4gICAgICB0aGlzLnBhY2thZ2VQYXRoID0gcGF0aC5wb3NpeC5qb2luKHdrc3AsIHBrZyk7XG4gICAgfVxuICB9XG5cbiAgbG9va3VwRGlyZWN0b3J5KGRpcjogc3RyaW5nKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLm1hbmlmZXN0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgdGhpcy5tYW5pZmVzdCkge1xuICAgICAgLy8gQWNjb3VudCBmb3IgQmF6ZWwgLS1sZWdhY3lfZXh0ZXJuYWxfcnVuZmlsZXNcbiAgICAgIC8vIHdoaWNoIHBvbGx1dGVzIHRoZSB3b3Jrc3BhY2Ugd2l0aCAnbXlfd2tzcC9leHRlcm5hbC8uLi4nXG4gICAgICBpZiAoay5zdGFydHNXaXRoKGAke2Rpcn0vZXh0ZXJuYWxgKSkgY29udGludWU7XG5cbiAgICAgIC8vIEVudHJ5IGxvb2tzIGxpa2VcbiAgICAgIC8vIGs6IG5wbS9ub2RlX21vZHVsZXMvc2VtdmVyL0xJQ0VOU0VcbiAgICAgIC8vIHY6IC9wYXRoL3RvL2V4dGVybmFsL25wbS9ub2RlX21vZHVsZXMvc2VtdmVyL0xJQ0VOU0VcbiAgICAgIC8vIGNhbGN1bGF0ZSBsID0gbGVuZ3RoKGAvc2VtdmVyL0xJQ0VOU0VgKVxuICAgICAgaWYgKGsuc3RhcnRzV2l0aChkaXIpKSB7XG4gICAgICAgIGNvbnN0IGwgPSBrLmxlbmd0aCAtIGRpci5sZW5ndGg7XG4gICAgICAgIHJldHVybiB2LnN1YnN0cmluZygwLCB2Lmxlbmd0aCAtIGwpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqIFRoZSBydW5maWxlcyBtYW5pZmVzdCBtYXBzIGZyb20gc2hvcnRfcGF0aFxuICAgKiBodHRwczovL2RvY3MuYmF6ZWwuYnVpbGQvdmVyc2lvbnMvbWFzdGVyL3NreWxhcmsvbGliL0ZpbGUuaHRtbCNzaG9ydF9wYXRoXG4gICAqIHRvIHRoZSBhY3R1YWwgbG9jYXRpb24gb24gZGlzayB3aGVyZSB0aGUgZmlsZSBjYW4gYmUgcmVhZC5cbiAgICpcbiAgICogSW4gYSBzYW5kYm94ZWQgZXhlY3V0aW9uLCBpdCBkb2VzIG5vdCBleGlzdC4gSW4gdGhhdCBjYXNlLCBydW5maWxlcyBtdXN0IGJlXG4gICAqIHJlc29sdmVkIGZyb20gYSBzeW1saW5rIHRyZWUgdW5kZXIgdGhlIHJ1bmZpbGVzIGRpci5cbiAgICogU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL2JhemVsL2lzc3Vlcy8zNzI2XG4gICAqL1xuICBsb2FkUnVuZmlsZXNNYW5pZmVzdChtYW5pZmVzdFBhdGg6IHN0cmluZykge1xuICAgIGxvZ192ZXJib3NlKGB1c2luZyBydW5maWxlcyBtYW5pZmVzdCAke21hbmlmZXN0UGF0aH1gKTtcblxuICAgIGNvbnN0IHJ1bmZpbGVzRW50cmllcyA9IG5ldyBNYXAoKTtcbiAgICBjb25zdCBpbnB1dCA9IGZzLnJlYWRGaWxlU3luYyhtYW5pZmVzdFBhdGgsIHtlbmNvZGluZzogJ3V0Zi04J30pO1xuXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGlucHV0LnNwbGl0KCdcXG4nKSkge1xuICAgICAgaWYgKCFsaW5lKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IFtydW5maWxlc1BhdGgsIHJlYWxQYXRoXSA9IGxpbmUuc3BsaXQoJyAnKTtcbiAgICAgIHJ1bmZpbGVzRW50cmllcy5zZXQocnVuZmlsZXNQYXRoLCByZWFsUGF0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ1bmZpbGVzRW50cmllcztcbiAgfVxuXG4gIHJlc29sdmUobW9kdWxlUGF0aDogc3RyaW5nKSB7XG4gICAgLy8gTG9vayBpbiB0aGUgcnVuZmlsZXMgZmlyc3RcbiAgICBpZiAodGhpcy5tYW5pZmVzdCkge1xuICAgICAgcmV0dXJuIHRoaXMubG9va3VwRGlyZWN0b3J5KG1vZHVsZVBhdGgpO1xuICAgIH1cbiAgICBpZiAocnVuZmlsZXMuZGlyKSB7XG4gICAgICByZXR1cm4gcGF0aC5qb2luKHJ1bmZpbGVzLmRpciwgbW9kdWxlUGF0aCk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgY291bGQgbm90IHJlc29sdmUgbW9kdWxlUGF0aCAke21vZHVsZVBhdGh9YCk7XG4gIH1cblxuICByZXNvbHZlUGFja2FnZVJlbGF0aXZlKG1vZHVsZVBhdGg6IHN0cmluZykge1xuICAgIGlmICghdGhpcy5wYWNrYWdlUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdwYWNrYWdlUGF0aCBjb3VsZCBub3QgYmUgZGV0ZXJtaW5lZCBmcm9tIHRoZSBlbnZpcm9ubWVudCcpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlKHBhdGgucG9zaXguam9pbih0aGlzLnBhY2thZ2VQYXRoLCBtb2R1bGVQYXRoKSk7XG4gIH1cbn1cblxuLy8gVHlwZVNjcmlwdCBsaWIuZXM1LmQudHMgaGFzIGEgbWlzdGFrZTogSlNPTi5wYXJzZSBkb2VzIGFjY2VwdCBCdWZmZXIuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBKU09OIHtcbiAgICBwYXJzZShiOiB7dG9TdHJpbmc6ICgpID0+IHN0cmluZ30pOiBhbnk7XG4gIH1cbn1cblxuLy8gVGhlcmUgaXMgbm8gZnMucHJvbWlzZXMuZXhpc3RzIGZ1bmN0aW9uIGJlY2F1c2Vcbi8vIG5vZGUgY29yZSBpcyBvZiB0aGUgb3BpbmlvbiB0aGF0IGV4aXN0cyBpcyBhbHdheXMgdG9vIHJhY2V5IHRvIHJlbHkgb24uXG5hc3luYyBmdW5jdGlvbiBleGlzdHMocDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgYXdhaXQgZnMucHJvbWlzZXMuc3RhdChwKVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfVxufVxuXG4vLyBTZWUgbGlua19ub2RlX21vZHVsZXMuYnpsIHdoZXJlIHRoZXNlIHRocmVlIHN0cmluZ3Ncbi8vIGFyZSB1c2VkIHRvIGluZGljYXRlIHdoaWNoIHJvb3QgdGhlIGxpbmtlciBzaG91bGQgdGFyZ2V0XG4vLyBmb3IgZWFjaCBwYWNrYWdlOlxuLy8gYmluOiBiYXplbC1iaW4vcGF0aC90by9wYWNrYWdlXG4vLyBzcmM6IHdvcmtzcGFjZS9wYXRoL3RvL3BhY2thZ2Vcbi8vIHJ1bmZpbGVzOiBsb29rIGluIHRoZSBydW5maWxlcyBkaXIvbWFuaWZlc3RcbnR5cGUgTGlua2VyUm9vdCA9ICdiaW4nfCdzcmMnfCdydW5maWxlcyc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYWluKGFyZ3M6IHN0cmluZ1tdLCBydW5maWxlczogUnVuZmlsZXMpIHtcbiAgaWYgKCFhcmdzIHx8IGFyZ3MubGVuZ3RoIDwgMSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2xpbmtfbm9kZV9tb2R1bGVzLmpzIHJlcXVpcmVzIG9uZSBhcmd1bWVudDogbW9kdWxlc01hbmlmZXN0IHBhdGgnKTtcblxuICBjb25zdCBbbW9kdWxlc01hbmlmZXN0XSA9IGFyZ3M7XG4gIGxldCB7YmluLCByb290LCBtb2R1bGVzLCB3b3Jrc3BhY2V9ID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMobW9kdWxlc01hbmlmZXN0KSk7XG4gIG1vZHVsZXMgPSBtb2R1bGVzIHx8IHt9O1xuICBsb2dfdmVyYm9zZShcbiAgICAgIGBtb2R1bGUgbWFuaWZlc3Q6IHdvcmtzcGFjZSAke3dvcmtzcGFjZX0sIGJpbiAke2Jpbn0sIHJvb3QgJHtcbiAgICAgICAgICByb290fSB3aXRoIGZpcnN0LXBhcnR5IHBhY2thZ2VzXFxuYCxcbiAgICAgIG1vZHVsZXMpO1xuXG4gIGNvbnN0IHJvb3REaXIgPSByZXNvbHZlUm9vdChyb290LCBydW5maWxlcyk7XG4gIGxvZ192ZXJib3NlKCdyZXNvbHZlZCByb290Jywgcm9vdCwgJ3RvJywgcm9vdERpcik7XG5cbiAgLy8gQmF6ZWwgc3RhcnRzIGFjdGlvbnMgd2l0aCBwd2Q9ZXhlY3Jvb3QvbXlfd2tzcFxuICBjb25zdCB3b3Jrc3BhY2VEaXIgPSBwYXRoLnJlc29sdmUoJy4nKTtcblxuICAvLyBDb252ZXJ0IGZyb20gcnVuZmlsZXMgcGF0aFxuICAvLyB0aGlzX3drc3AvcGF0aC90by9maWxlIE9SIG90aGVyX3drc3AvcGF0aC90by9maWxlXG4gIC8vIHRvIGV4ZWNyb290IHBhdGhcbiAgLy8gcGF0aC90by9maWxlIE9SIGV4dGVybmFsL290aGVyX3drc3AvcGF0aC90by9maWxlXG4gIGZ1bmN0aW9uIHRvV29ya3NwYWNlRGlyKHA6IHN0cmluZykge1xuICAgIGlmIChwID09PSB3b3Jrc3BhY2UpIHtcbiAgICAgIHJldHVybiAnLic7XG4gICAgfVxuICAgIC8vIFRoZSBtYW5pZmVzdCBpcyB3cml0dGVuIHdpdGggZm9yd2FyZCBzbGFzaCBvbiBhbGwgcGxhdGZvcm1zXG4gICAgaWYgKHAuc3RhcnRzV2l0aCh3b3Jrc3BhY2UgKyAnLycpKSB7XG4gICAgICByZXR1cm4gcC5zdWJzdHJpbmcod29ya3NwYWNlLmxlbmd0aCArIDEpO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aC5qb2luKCdleHRlcm5hbCcsIHApO1xuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSAkcHdkL25vZGVfbW9kdWxlcyBkaXJlY3RvcnkgdGhhdCBub2RlIHdpbGwgcmVzb2x2ZSBmcm9tXG4gIGF3YWl0IHN5bWxpbmsocm9vdERpciwgJ25vZGVfbW9kdWxlcycpO1xuICBwcm9jZXNzLmNoZGlyKHJvb3REaXIpO1xuXG4gIC8vIFN5bWxpbmtzIHRvIHBhY2thZ2VzIG5lZWQgdG8gcmVhY2ggYmFjayB0byB0aGUgd29ya3NwYWNlL3J1bmZpbGVzIGRpcmVjdG9yeVxuICBjb25zdCB3b3Jrc3BhY2VBYnMgPSBwYXRoLnJlc29sdmUod29ya3NwYWNlRGlyKTtcblxuICAvLyBOb3cgYWRkIHN5bWxpbmtzIHRvIGVhY2ggb2Ygb3VyIGZpcnN0LXBhcnR5IHBhY2thZ2VzIHNvIHRoZXkgYXBwZWFyIHVuZGVyIHRoZSBub2RlX21vZHVsZXMgdHJlZVxuICBjb25zdCBsaW5rcyA9IFtdO1xuXG4gIGNvbnN0IGxpbmtNb2R1bGUgPVxuICAgICAgYXN5bmMgKG5hbWU6IHN0cmluZywgcm9vdDogTGlua2VyUm9vdCwgbW9kdWxlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgbGV0IHRhcmdldDogc3RyaW5nID0gJzxwYWNrYWdlIGxpbmtpbmcgZmFpbGVkPic7XG4gICAgc3dpdGNoIChyb290KSB7XG4gICAgICBjYXNlICdiaW4nOlxuICAgICAgICAvLyBGSVhNRSgjMTE5NilcbiAgICAgICAgdGFyZ2V0ID0gcGF0aC5qb2luKHdvcmtzcGFjZUFicywgYmluLCB0b1dvcmtzcGFjZURpcihtb2R1bGVQYXRoKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3JjJzpcbiAgICAgICAgdGFyZ2V0ID0gcGF0aC5qb2luKHdvcmtzcGFjZUFicywgdG9Xb3Jrc3BhY2VEaXIobW9kdWxlUGF0aCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3J1bmZpbGVzJzpcbiAgICAgICAgdGFyZ2V0ID0gcnVuZmlsZXMucmVzb2x2ZShtb2R1bGVQYXRoKSB8fCAnPHJ1bmZpbGVzIHJlc29sdXRpb24gZmFpbGVkPic7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGF3YWl0IHN5bWxpbmsodGFyZ2V0LCBuYW1lKTtcbiAgfVxuXG4gIGZvciAoY29uc3QgbSBvZiBPYmplY3Qua2V5cyhtb2R1bGVzKSkge1xuICAgIGNvbnN0IHNlZ21lbnRzID0gbS5zcGxpdCgnLycpO1xuICAgIGlmIChzZWdtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG1vZHVsZSAke219IGhhcyBtb3JlIHRoYW4gMiBzZWdtZW50cyB3aGljaCBpcyBub3QgYSB2YWxpZCBub2RlIG1vZHVsZSBuYW1lYCk7XG4gICAgfVxuICAgIGlmIChzZWdtZW50cy5sZW5ndGggPT0gMikge1xuICAgICAgLy8gZW5zdXJlIHRoZSBzY29wZSBleGlzdHNcbiAgICAgIG1rZGlycChzZWdtZW50c1swXSk7XG4gICAgfVxuICAgIGNvbnN0IFtraW5kLCBtb2R1bGVQYXRoXSA9IG1vZHVsZXNbbV07XG4gICAgbGlua3MucHVzaChsaW5rTW9kdWxlKG0sIGtpbmQsIG1vZHVsZVBhdGgpKTtcbiAgfVxuXG4gIGxldCBjb2RlID0gMDtcbiAgYXdhaXQgUHJvbWlzZS5hbGwobGlua3MpLmNhdGNoKGUgPT4ge1xuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgY29kZSA9IDE7XG4gIH0pO1xuXG4gIHJldHVybiBjb2RlO1xufVxuXG5leHBvcnQgY29uc3QgcnVuZmlsZXMgPSBuZXcgUnVuZmlsZXMocHJvY2Vzcy5lbnYpO1xuXG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgKGFzeW5jICgpID0+IHtcbiAgICBwcm9jZXNzLmV4aXRDb2RlID0gYXdhaXQgbWFpbihwcm9jZXNzLmFyZ3Yuc2xpY2UoMiksIHJ1bmZpbGVzKTtcbiAgfSkoKTtcbn1cbiJdfQ==
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
            // how can we avoid this FS lookup every time? we don't know when process.cwd changed...
            // const runfilesRelative = runfiles.dir ? path.relative('.', runfiles.dir) : undefined;
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
    exports.runfiles = new Runfiles(process.env);
    if (require.main === module) {
        (() => __awaiter(this, void 0, void 0, function* () {
            process.exitCode = yield main(process.argv.slice(2), exports.runfiles);
        }))();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua19ub2RlX21vZHVsZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC9saW5rZXIvbGlua19ub2RlX21vZHVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFBOzs7O09BSUc7SUFDSCx5QkFBeUI7SUFDekIsNkJBQTZCO0lBRTdCLGdFQUFnRTtJQUNoRSxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUVuRCxTQUFTLFdBQVcsQ0FBQyxHQUFHLENBQVc7UUFDakMsSUFBSSxZQUFZO1lBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxTQUFTLEtBQUssQ0FBQyxDQUFTO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUM7Ozs7OztJQU1kLENBQUM7R0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBZSxPQUFPLENBQUMsTUFBYyxFQUFFLElBQVk7O1lBQ2pELFdBQVcsQ0FBQyxZQUFZLElBQUksT0FBTyxNQUFNLElBQUksQ0FBQyxDQUFDO1lBQy9DLHVFQUF1RTtZQUN2RSx3REFBd0Q7WUFDeEQsSUFBSTtnQkFDRixNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7YUFDckQ7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO29CQUN2QixNQUFNLENBQUMsQ0FBQztpQkFDVDtnQkFDRCx3RUFBd0U7Z0JBQ3hFLDJFQUEyRTtnQkFDM0UsNEVBQTRFO2FBQzdFO1lBRUQsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLDBDQUEwQztnQkFDMUMsMkVBQTJFO2dCQUMzRSx3QkFBd0I7Z0JBQ3hC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SUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN2QztZQUVELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUV6QixPQUFPLENBQUMsQ0FBQztRQUNYLENBQUM7S0FBQTtJQXBFRCxvQkFvRUM7SUFFWSxRQUFBLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFbEQsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtRQUMzQixDQUFDLEdBQVMsRUFBRTtZQUNWLE9BQU8sQ0FBQyxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0JBQVEsQ0FBQyxDQUFDO1FBQ2pFLENBQUMsQ0FBQSxDQUFDLEVBQUUsQ0FBQztLQUNOIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IENyZWF0ZXMgYSBub2RlX21vZHVsZXMgZGlyZWN0b3J5IGluIHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG4gKiBhbmQgc3ltbGlua3MgaW4gdGhlIG5vZGUgbW9kdWxlcyBuZWVkZWQgdG8gcnVuIGEgcHJvZ3JhbS5cbiAqIFRoaXMgcmVwbGFjZXMgdGhlIG5lZWQgZm9yIGN1c3RvbSBtb2R1bGUgcmVzb2x1dGlvbiBsb2dpYyBpbnNpZGUgdGhlIHByb2Nlc3MuXG4gKi9cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbi8vIFJ1biBCYXplbCB3aXRoIC0tZGVmaW5lPVZFUkJPU0VfTE9HUz0xIHRvIGVuYWJsZSB0aGlzIGxvZ2dpbmdcbmNvbnN0IFZFUkJPU0VfTE9HUyA9ICEhcHJvY2Vzcy5lbnZbJ1ZFUkJPU0VfTE9HUyddO1xuXG5mdW5jdGlvbiBsb2dfdmVyYm9zZSguLi5tOiBzdHJpbmdbXSkge1xuICBpZiAoVkVSQk9TRV9MT0dTKSBjb25zb2xlLmVycm9yKCdbbGlua19ub2RlX21vZHVsZXMuanNdJywgLi4ubSk7XG59XG5cbmZ1bmN0aW9uIHBhbmljKG06IHN0cmluZykge1xuICB0aHJvdyBuZXcgRXJyb3IoYEludGVybmFsIGVycm9yISBQbGVhc2UgcnVuIGFnYWluIHdpdGhcbiAgIC0tZGVmaW5lPVZFUkJPU0VfTE9HPTFcbmFuZCBmaWxlIGFuIGlzc3VlOiBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9ydWxlc19ub2RlanMvaXNzdWVzL25ldz90ZW1wbGF0ZT1idWdfcmVwb3J0Lm1kXG5JbmNsdWRlIGFzIG11Y2ggb2YgdGhlIGJ1aWxkIG91dHB1dCBhcyB5b3UgY2FuIHdpdGhvdXQgZGlzY2xvc2luZyBhbnl0aGluZyBjb25maWRlbnRpYWwuXG5cbiAgRXJyb3I6XG4gICR7bX1cbiAgYCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHN5bWxpbmsodGFyZ2V0OiBzdHJpbmcsIHBhdGg6IHN0cmluZykge1xuICBsb2dfdmVyYm9zZShgc3ltbGluayggJHtwYXRofSAtPiAke3RhcmdldH0gKWApO1xuICAvLyBVc2UganVuY3Rpb24gb24gV2luZG93cyBzaW5jZSBzeW1saW5rcyByZXF1aXJlIGVsZXZhdGVkIHBlcm1pc3Npb25zLlxuICAvLyBXZSBvbmx5IGxpbmsgdG8gZGlyZWN0b3JpZXMgc28ganVuY3Rpb25zIHdvcmsgZm9yIHVzLlxuICB0cnkge1xuICAgIGF3YWl0IGZzLnByb21pc2VzLnN5bWxpbmsodGFyZ2V0LCBwYXRoLCAnanVuY3Rpb24nKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlLmNvZGUgIT09ICdFRVhJU1QnKSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgICAvLyBXZSBhc3N1bWUgaGVyZSB0aGF0IHRoZSBwYXRoIGlzIGFscmVhZHkgbGlua2VkIHRvIHRoZSBjb3JyZWN0IHRhcmdldC5cbiAgICAvLyBDb3VsZCBhZGQgc29tZSBsb2dpYyB0aGF0IGFzc2VydHMgaXQgaGVyZSwgYnV0IHdlIHdhbnQgdG8gYXZvaWQgYW4gZXh0cmFcbiAgICAvLyBmaWxlc3lzdGVtIGFjY2VzcyBzbyB3ZSBzaG91bGQgb25seSBkbyBpdCB1bmRlciBzb21lIGtpbmQgb2Ygc3RyaWN0IG1vZGUuXG4gIH1cblxuICBpZiAoVkVSQk9TRV9MT0dTKSB7XG4gICAgLy8gQmUgdmVyYm9zZSBhYm91dCBjcmVhdGluZyBhIGJhZCBzeW1saW5rXG4gICAgLy8gTWF5YmUgdGhpcyBzaG91bGQgZmFpbCBpbiBwcm9kdWN0aW9uIGFzIHdlbGwsIGJ1dCBhZ2FpbiB3ZSB3YW50IHRvIGF2b2lkXG4gICAgLy8gYW55IHVubmVlZGVkIGZpbGUgSS9PXG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKHBhdGgpKSB7XG4gICAgICBsb2dfdmVyYm9zZShcbiAgICAgICAgICAnRVJST1JcXG4qKipcXG5Mb29rcyBsaWtlIHdlIGNyZWF0ZWQgYSBiYWQgc3ltbGluazonICtcbiAgICAgICAgICBgXFxuICBwd2QgJHtwcm9jZXNzLmN3ZCgpfVxcbiAgdGFyZ2V0ICR7dGFyZ2V0fVxcbioqKmApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJlc29sdmUgYSByb290IGRpcmVjdG9yeSBzdHJpbmcgdG8gdGhlIGFjdHVhbCBsb2NhdGlvbiBvbiBkaXNrXG4gKiB3aGVyZSBub2RlX21vZHVsZXMgd2FzIGluc3RhbGxlZFxuICogQHBhcmFtIHJvb3QgYSBzdHJpbmcgbGlrZSAnbnBtL25vZGVfbW9kdWxlcydcbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVJvb3Qocm9vdDogc3RyaW5nfHVuZGVmaW5lZCwgcnVuZmlsZXM6IFJ1bmZpbGVzKSB7XG4gIC8vIGNyZWF0ZSBhIG5vZGVfbW9kdWxlcyBkaXJlY3RvcnkgaWYgbm8gcm9vdFxuICAvLyB0aGlzIHdpbGwgYmUgdGhlIGNhc2UgaWYgb25seSBmaXJzdC1wYXJ0eSBtb2R1bGVzIGFyZSBpbnN0YWxsZWRcbiAgaWYgKCFyb290KSB7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgbG9nX3ZlcmJvc2UoJ25vIHRoaXJkLXBhcnR5IHBhY2thZ2VzOyBta2RpciBub2RlX21vZHVsZXMgaW4gJywgcHJvY2Vzcy5jd2QoKSk7XG4gICAgICBmcy5ta2RpclN5bmMoJ25vZGVfbW9kdWxlcycpO1xuICAgIH1cbiAgICByZXR1cm4gJ25vZGVfbW9kdWxlcyc7XG4gIH1cblxuICAvLyBJZiB3ZSBnb3QgYSBydW5maWxlc01hbmlmZXN0IG1hcCwgbG9vayB0aHJvdWdoIGl0IGZvciBhIHJlc29sdXRpb25cbiAgLy8gVGhpcyB3aWxsIGhhcHBlbiBpZiB3ZSBhcmUgcnVubmluZyBhIGJpbmFyeSB0aGF0IGhhZCBzb21lIG5wbSBwYWNrYWdlc1xuICAvLyBcInN0YXRpY2FsbHkgbGlua2VkXCIgaW50byBpdHMgcnVuZmlsZXNcbiAgY29uc3QgZnJvbU1hbmlmZXN0ID0gcnVuZmlsZXMubG9va3VwRGlyZWN0b3J5KHJvb3QpO1xuICBpZiAoZnJvbU1hbmlmZXN0KSByZXR1cm4gZnJvbU1hbmlmZXN0O1xuXG4gIC8vIEFjY291bnQgZm9yIEJhemVsIC0tbGVnYWN5X2V4dGVybmFsX3J1bmZpbGVzXG4gIC8vIHdoaWNoIGxvb2sgbGlrZSAnbXlfd2tzcC9leHRlcm5hbC9ucG0vbm9kZV9tb2R1bGVzJ1xuICBpZiAoZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCkpKSB7XG4gICAgbG9nX3ZlcmJvc2UoJ0ZvdW5kIGxlZ2FjeV9leHRlcm5hbF9ydW5maWxlcywgc3dpdGNoaW5nIHJvb3QgdG8nLCBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCkpO1xuICAgIHJldHVybiBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCk7XG4gIH1cblxuICAvLyBUaGUgcmVwb3NpdG9yeSBzaG91bGQgYmUgbGF5ZWQgb3V0IGluIHRoZSBwYXJlbnQgZGlyZWN0b3J5XG4gIC8vIHNpbmNlIGJhemVsIHNldHMgb3VyIHdvcmtpbmcgZGlyZWN0b3J5IHRvIHRoZSByZXBvc2l0b3J5IHdoZXJlIHRoZSBidWlsZCBpcyBoYXBwZW5pbmdcbiAgcmV0dXJuIHBhdGguam9pbignLi4nLCByb290KTtcbn1cblxuZXhwb3J0IGNsYXNzIFJ1bmZpbGVzIHtcbiAgbWFuaWZlc3Q6IE1hcDxzdHJpbmcsIHN0cmluZz58dW5kZWZpbmVkO1xuICBkaXI6IHN0cmluZ3x1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBJZiB0aGUgZW52aXJvbm1lbnQgZ2l2ZXMgdXMgZW5vdWdoIGhpbnRzLCB3ZSBjYW4ga25vdyB0aGUgcGF0aCB0byB0aGUgcGFja2FnZVxuICAgKiBpbiB0aGUgZm9ybSB3b3Jrc3BhY2VfbmFtZS9wYXRoL3RvL3BhY2thZ2VcbiAgICovXG4gIHBhY2thZ2VQYXRoOiBzdHJpbmd8dW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKGVudjogdHlwZW9mIHByb2Nlc3MuZW52KSB7XG4gICAgLy8gSWYgQmF6ZWwgc2V0cyBhIHZhcmlhYmxlIHBvaW50aW5nIHRvIGEgcnVuZmlsZXMgbWFuaWZlc3QsXG4gICAgLy8gd2UnbGwgYWx3YXlzIHVzZSBpdC5cbiAgICAvLyBOb3RlIHRoYXQgdGhpcyBoYXMgYSBzbGlnaHQgcGVyZm9ybWFuY2UgaW1wbGljYXRpb24gb24gTWFjL0xpbnV4XG4gICAgLy8gd2hlcmUgd2UgY291bGQgdXNlIHRoZSBydW5maWxlcyB0cmVlIGFscmVhZHkgbGFpZCBvdXQgb24gZGlza1xuICAgIC8vIGJ1dCB0aGlzIGp1c3QgY29zdHMgb25lIGZpbGUgcmVhZCBmb3IgdGhlIGV4dGVybmFsIG5wbS9ub2RlX21vZHVsZXNcbiAgICAvLyBhbmQgb25lIGZvciBlYWNoIGZpcnN0LXBhcnR5IG1vZHVsZSwgbm90IG9uZSBwZXIgZmlsZS5cbiAgICBpZiAoISFlbnZbJ1JVTkZJTEVTX01BTklGRVNUX0ZJTEUnXSkge1xuICAgICAgdGhpcy5tYW5pZmVzdCA9IHRoaXMubG9hZFJ1bmZpbGVzTWFuaWZlc3QoZW52WydSVU5GSUxFU19NQU5JRkVTVF9GSUxFJ10hKTtcbiAgICB9IGVsc2UgaWYgKCEhZW52WydSVU5GSUxFU19ESVInXSkge1xuICAgICAgdGhpcy5kaXIgPSBwYXRoLnJlc29sdmUoZW52WydSVU5GSUxFU19ESVInXSEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYW5pYyhcbiAgICAgICAgICAnRXZlcnkgbm9kZSBwcm9ncmFtIHJ1biB1bmRlciBCYXplbCBtdXN0IGhhdmUgYSAkUlVORklMRVNfRElSIG9yICRSVU5GSUxFU19NQU5JRkVTVF9GSUxFIGVudmlyb25tZW50IHZhcmlhYmxlJyk7XG4gICAgfVxuICAgIC8vIFVuZGVyIC0tbm9lbmFibGVfcnVuZmlsZXMgKGluIHBhcnRpY3VsYXIgb24gV2luZG93cylcbiAgICAvLyBCYXplbCBzZXRzIFJVTkZJTEVTX01BTklGRVNUX09OTFk9MS5cbiAgICAvLyBXaGVuIHRoaXMgaGFwcGVucywgd2UgbmVlZCB0byByZWFkIHRoZSBtYW5pZmVzdCBmaWxlIHRvIGxvY2F0ZVxuICAgIC8vIGlucHV0c1xuICAgIGlmIChlbnZbJ1JVTkZJTEVTX01BTklGRVNUX09OTFknXSA9PT0gJzEnICYmICFlbnZbJ1JVTkZJTEVTX01BTklGRVNUX0ZJTEUnXSkge1xuICAgICAgbG9nX3ZlcmJvc2UoYFdvcmthcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvYmF6ZWwvaXNzdWVzLzc5OTRcbiAgICAgICAgICAgICAgICAgUlVORklMRVNfTUFOSUZFU1RfRklMRSBzaG91bGQgaGF2ZSBiZWVuIHNldCBidXQgd2Fzbid0LlxuICAgICAgICAgICAgICAgICBmYWxsaW5nIGJhY2sgdG8gdXNpbmcgcnVuZmlsZXMgc3ltbGlua3MuXG4gICAgICAgICAgICAgICAgIElmIHlvdSB3YW50IHRvIHRlc3QgcnVuZmlsZXMgbWFuaWZlc3QgYmVoYXZpb3IsIGFkZFxuICAgICAgICAgICAgICAgICAtLXNwYXduX3N0cmF0ZWd5PXN0YW5kYWxvbmUgdG8gdGhlIGNvbW1hbmQgbGluZS5gKTtcbiAgICB9XG5cbiAgICBjb25zdCB3a3NwID0gZW52WydURVNUX1dPUktTUEFDRSddO1xuICAgIGNvbnN0IHRhcmdldCA9IGVudlsnVEVTVF9UQVJHRVQnXTtcbiAgICBpZiAoISF3a3NwICYmICEhdGFyZ2V0KSB7XG4gICAgICAvLyAvL3BhdGgvdG86dGFyZ2V0IC0+IC8vcGF0aC90b1xuICAgICAgY29uc3QgcGtnID0gdGFyZ2V0LnNwbGl0KCc6JylbMF07XG4gICAgICB0aGlzLnBhY2thZ2VQYXRoID0gcGF0aC5wb3NpeC5qb2luKHdrc3AsIHBrZyk7XG4gICAgfVxuICB9XG5cbiAgbG9va3VwRGlyZWN0b3J5KGRpcjogc3RyaW5nKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLm1hbmlmZXN0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgdGhpcy5tYW5pZmVzdCkge1xuICAgICAgLy8gQWNjb3VudCBmb3IgQmF6ZWwgLS1sZWdhY3lfZXh0ZXJuYWxfcnVuZmlsZXNcbiAgICAgIC8vIHdoaWNoIHBvbGx1dGVzIHRoZSB3b3Jrc3BhY2Ugd2l0aCAnbXlfd2tzcC9leHRlcm5hbC8uLi4nXG4gICAgICBpZiAoay5zdGFydHNXaXRoKGAke2Rpcn0vZXh0ZXJuYWxgKSkgY29udGludWU7XG5cbiAgICAgIC8vIEVudHJ5IGxvb2tzIGxpa2VcbiAgICAgIC8vIGs6IG5wbS9ub2RlX21vZHVsZXMvc2VtdmVyL0xJQ0VOU0VcbiAgICAgIC8vIHY6IC9wYXRoL3RvL2V4dGVybmFsL25wbS9ub2RlX21vZHVsZXMvc2VtdmVyL0xJQ0VOU0VcbiAgICAgIC8vIGNhbGN1bGF0ZSBsID0gbGVuZ3RoKGAvc2VtdmVyL0xJQ0VOU0VgKVxuICAgICAgaWYgKGsuc3RhcnRzV2l0aChkaXIpKSB7XG4gICAgICAgIGNvbnN0IGwgPSBrLmxlbmd0aCAtIGRpci5sZW5ndGg7XG4gICAgICAgIHJldHVybiB2LnN1YnN0cmluZygwLCB2Lmxlbmd0aCAtIGwpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqIFRoZSBydW5maWxlcyBtYW5pZmVzdCBtYXBzIGZyb20gc2hvcnRfcGF0aFxuICAgKiBodHRwczovL2RvY3MuYmF6ZWwuYnVpbGQvdmVyc2lvbnMvbWFzdGVyL3NreWxhcmsvbGliL0ZpbGUuaHRtbCNzaG9ydF9wYXRoXG4gICAqIHRvIHRoZSBhY3R1YWwgbG9jYXRpb24gb24gZGlzayB3aGVyZSB0aGUgZmlsZSBjYW4gYmUgcmVhZC5cbiAgICpcbiAgICogSW4gYSBzYW5kYm94ZWQgZXhlY3V0aW9uLCBpdCBkb2VzIG5vdCBleGlzdC4gSW4gdGhhdCBjYXNlLCBydW5maWxlcyBtdXN0IGJlXG4gICAqIHJlc29sdmVkIGZyb20gYSBzeW1saW5rIHRyZWUgdW5kZXIgdGhlIHJ1bmZpbGVzIGRpci5cbiAgICogU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL2JhemVsL2lzc3Vlcy8zNzI2XG4gICAqL1xuICBsb2FkUnVuZmlsZXNNYW5pZmVzdChtYW5pZmVzdFBhdGg6IHN0cmluZykge1xuICAgIGxvZ192ZXJib3NlKGB1c2luZyBydW5maWxlcyBtYW5pZmVzdCAke21hbmlmZXN0UGF0aH1gKTtcblxuICAgIGNvbnN0IHJ1bmZpbGVzRW50cmllcyA9IG5ldyBNYXAoKTtcbiAgICBjb25zdCBpbnB1dCA9IGZzLnJlYWRGaWxlU3luYyhtYW5pZmVzdFBhdGgsIHtlbmNvZGluZzogJ3V0Zi04J30pO1xuXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGlucHV0LnNwbGl0KCdcXG4nKSkge1xuICAgICAgaWYgKCFsaW5lKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IFtydW5maWxlc1BhdGgsIHJlYWxQYXRoXSA9IGxpbmUuc3BsaXQoJyAnKTtcbiAgICAgIHJ1bmZpbGVzRW50cmllcy5zZXQocnVuZmlsZXNQYXRoLCByZWFsUGF0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ1bmZpbGVzRW50cmllcztcbiAgfVxuXG4gIHJlc29sdmUobW9kdWxlUGF0aDogc3RyaW5nKSB7XG4gICAgLy8gTG9vayBpbiB0aGUgcnVuZmlsZXMgZmlyc3RcbiAgICBpZiAodGhpcy5tYW5pZmVzdCkge1xuICAgICAgcmV0dXJuIHRoaXMubG9va3VwRGlyZWN0b3J5KG1vZHVsZVBhdGgpO1xuICAgIH1cbiAgICAvLyBob3cgY2FuIHdlIGF2b2lkIHRoaXMgRlMgbG9va3VwIGV2ZXJ5IHRpbWU/IHdlIGRvbid0IGtub3cgd2hlbiBwcm9jZXNzLmN3ZCBjaGFuZ2VkLi4uXG4gICAgLy8gY29uc3QgcnVuZmlsZXNSZWxhdGl2ZSA9IHJ1bmZpbGVzLmRpciA/IHBhdGgucmVsYXRpdmUoJy4nLCBydW5maWxlcy5kaXIpIDogdW5kZWZpbmVkO1xuICAgIGlmIChydW5maWxlcy5kaXIpIHtcbiAgICAgIHJldHVybiBwYXRoLmpvaW4ocnVuZmlsZXMuZGlyLCBtb2R1bGVQYXRoKTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBjb3VsZCBub3QgcmVzb2x2ZSBtb2R1bGVQYXRoICR7bW9kdWxlUGF0aH1gKTtcbiAgfVxuXG4gIHJlc29sdmVQYWNrYWdlUmVsYXRpdmUobW9kdWxlUGF0aDogc3RyaW5nKSB7XG4gICAgaWYgKCF0aGlzLnBhY2thZ2VQYXRoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BhY2thZ2VQYXRoIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkIGZyb20gdGhlIGVudmlyb25tZW50Jyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlc29sdmUocGF0aC5wb3NpeC5qb2luKHRoaXMucGFja2FnZVBhdGgsIG1vZHVsZVBhdGgpKTtcbiAgfVxufVxuXG4vLyBUeXBlU2NyaXB0IGxpYi5lczUuZC50cyBoYXMgYSBtaXN0YWtlOiBKU09OLnBhcnNlIGRvZXMgYWNjZXB0IEJ1ZmZlci5cbmRlY2xhcmUgZ2xvYmFsIHtcbiAgaW50ZXJmYWNlIEpTT04ge1xuICAgIHBhcnNlKGI6IHt0b1N0cmluZzogKCkgPT4gc3RyaW5nfSk6IGFueTtcbiAgfVxufVxuXG4vLyBUaGVyZSBpcyBubyBmcy5wcm9taXNlcy5leGlzdHMgZnVuY3Rpb24gYmVjYXVzZVxuLy8gbm9kZSBjb3JlIGlzIG9mIHRoZSBvcGluaW9uIHRoYXQgZXhpc3RzIGlzIGFsd2F5cyB0b28gcmFjZXkgdG8gcmVseSBvbi5cbmFzeW5jIGZ1bmN0aW9uIGV4aXN0cyhwOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5wcm9taXNlcy5zdGF0KHApXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoZS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYWluKGFyZ3M6IHN0cmluZ1tdLCBydW5maWxlczogUnVuZmlsZXMpIHtcbiAgaWYgKCFhcmdzIHx8IGFyZ3MubGVuZ3RoIDwgMSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2xpbmtfbm9kZV9tb2R1bGVzLmpzIHJlcXVpcmVzIG9uZSBhcmd1bWVudDogbW9kdWxlc01hbmlmZXN0IHBhdGgnKTtcblxuICBjb25zdCBbbW9kdWxlc01hbmlmZXN0XSA9IGFyZ3M7XG4gIGxldCB7YmluLCByb290LCBtb2R1bGVzLCB3b3Jrc3BhY2V9ID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMobW9kdWxlc01hbmlmZXN0KSk7XG4gIG1vZHVsZXMgPSBtb2R1bGVzIHx8IHt9O1xuICBsb2dfdmVyYm9zZShcbiAgICAgIGBtb2R1bGUgbWFuaWZlc3Q6IHdvcmtzcGFjZSAke3dvcmtzcGFjZX0sIGJpbiAke2Jpbn0sIHJvb3QgJHtcbiAgICAgICAgICByb290fSB3aXRoIGZpcnN0LXBhcnR5IHBhY2thZ2VzXFxuYCxcbiAgICAgIG1vZHVsZXMpO1xuXG4gIGNvbnN0IHJvb3REaXIgPSByZXNvbHZlUm9vdChyb290LCBydW5maWxlcyk7XG4gIGxvZ192ZXJib3NlKCdyZXNvbHZlZCByb290Jywgcm9vdCwgJ3RvJywgcm9vdERpcik7XG5cbiAgLy8gQmF6ZWwgc3RhcnRzIGFjdGlvbnMgd2l0aCBwd2Q9ZXhlY3Jvb3QvbXlfd2tzcFxuICBjb25zdCB3b3Jrc3BhY2VEaXIgPSBwYXRoLnJlc29sdmUoJy4nKTtcblxuICAvLyBDb252ZXJ0IGZyb20gcnVuZmlsZXMgcGF0aFxuICAvLyB0aGlzX3drc3AvcGF0aC90by9maWxlIE9SIG90aGVyX3drc3AvcGF0aC90by9maWxlXG4gIC8vIHRvIGV4ZWNyb290IHBhdGhcbiAgLy8gcGF0aC90by9maWxlIE9SIGV4dGVybmFsL290aGVyX3drc3AvcGF0aC90by9maWxlXG4gIGZ1bmN0aW9uIHRvV29ya3NwYWNlRGlyKHA6IHN0cmluZykge1xuICAgIGlmIChwID09PSB3b3Jrc3BhY2UpIHtcbiAgICAgIHJldHVybiAnLic7XG4gICAgfVxuICAgIC8vIFRoZSBtYW5pZmVzdCBpcyB3cml0dGVuIHdpdGggZm9yd2FyZCBzbGFzaCBvbiBhbGwgcGxhdGZvcm1zXG4gICAgaWYgKHAuc3RhcnRzV2l0aCh3b3Jrc3BhY2UgKyAnLycpKSB7XG4gICAgICByZXR1cm4gcC5zdWJzdHJpbmcod29ya3NwYWNlLmxlbmd0aCArIDEpO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aC5qb2luKCdleHRlcm5hbCcsIHApO1xuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSAkcHdkL25vZGVfbW9kdWxlcyBkaXJlY3RvcnkgdGhhdCBub2RlIHdpbGwgcmVzb2x2ZSBmcm9tXG4gIGF3YWl0IHN5bWxpbmsocm9vdERpciwgJ25vZGVfbW9kdWxlcycpO1xuICBwcm9jZXNzLmNoZGlyKHJvb3REaXIpO1xuXG4gIC8vIFN5bWxpbmtzIHRvIHBhY2thZ2VzIG5lZWQgdG8gcmVhY2ggYmFjayB0byB0aGUgd29ya3NwYWNlL3J1bmZpbGVzIGRpcmVjdG9yeVxuICBjb25zdCB3b3Jrc3BhY2VSZWxhdGl2ZSA9IHBhdGgucmVsYXRpdmUoJy4nLCB3b3Jrc3BhY2VEaXIpO1xuXG4gIC8vIE5vdyBhZGQgc3ltbGlua3MgdG8gZWFjaCBvZiBvdXIgZmlyc3QtcGFydHkgcGFja2FnZXMgc28gdGhleSBhcHBlYXIgdW5kZXIgdGhlIG5vZGVfbW9kdWxlcyB0cmVlXG4gIGNvbnN0IGxpbmtzID0gW107XG5cbiAgY29uc3QgbGlua01vZHVsZSA9XG4gICAgICBhc3luYyAobmFtZTogc3RyaW5nLCBtb2R1bGVQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBsZXQgdGFyZ2V0ID0gcnVuZmlsZXMucmVzb2x2ZShtb2R1bGVQYXRoKTtcblxuICAgIC8vIEl0IHN1Y2tzIHRoYXQgd2UgaGF2ZSB0byBkbyBhIEZTIGNhbGwgaGVyZS5cbiAgICAvLyBUT0RPOiBjb3VsZCB3ZSBrbm93IHdoaWNoIHBhY2thZ2VzIGFyZSBzdGF0aWNhbGx5IGxpbmtlZD8/XG4gICAgaWYgKCF0YXJnZXQgfHwgIWF3YWl0IGV4aXN0cyh0YXJnZXQpKSB7XG4gICAgICAvLyBUcnkgdGhlIGJpbiBkaXJcbiAgICAgIHRhcmdldCA9IHBhdGguam9pbih3b3Jrc3BhY2VSZWxhdGl2ZSwgYmluLCB0b1dvcmtzcGFjZURpcihtb2R1bGVQYXRoKSk7XG4gICAgICBpZiAoIWF3YWl0IGV4aXN0cyh0YXJnZXQpKSB7XG4gICAgICAgIC8vIFRyeSB0aGUgZXhlY3Jvb3RcbiAgICAgICAgdGFyZ2V0ID0gcGF0aC5qb2luKHdvcmtzcGFjZVJlbGF0aXZlLCB0b1dvcmtzcGFjZURpcihtb2R1bGVQYXRoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXdhaXQgc3ltbGluayh0YXJnZXQsIG5hbWUpO1xuICB9XG5cbiAgZm9yIChjb25zdCBtIG9mIE9iamVjdC5rZXlzKG1vZHVsZXMpKSB7XG4gICAgbGlua3MucHVzaChsaW5rTW9kdWxlKG0sIG1vZHVsZXNbbV0pKTtcbiAgfVxuXG4gIGF3YWl0IFByb21pc2UuYWxsKGxpbmtzKTtcblxuICByZXR1cm4gMDtcbn1cblxuZXhwb3J0IGNvbnN0IHJ1bmZpbGVzID0gbmV3IFJ1bmZpbGVzKHByb2Nlc3MuZW52KTtcblxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIChhc3luYyAoKSA9PiB7XG4gICAgcHJvY2Vzcy5leGl0Q29kZSA9IGF3YWl0IG1haW4ocHJvY2Vzcy5hcmd2LnNsaWNlKDIpLCBydW5maWxlcyk7XG4gIH0pKCk7XG59XG4iXX0=
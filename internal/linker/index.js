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
            let { root, modules, workspace } = JSON.parse(fs.readFileSync(modulesManifest));
            modules = modules || {};
            log_verbose(`module manifest: workspace ${workspace}, root ${root} with first-party packages\n`, modules);
            const rootDir = resolveRoot(root, runfiles);
            log_verbose('resolved root', root, 'to', rootDir);
            // Bazel starts actions with pwd=execroot/my_wksp
            const workspaceDir = path.resolve('.');
            // Convert from runfiles path
            // this_wksp/path/to/file OR other_wksp/path/to/file
            // to execroot path
            // path/to/file OR external/other_wksp/path/to/file
            function toWorkspaceDir(p) {
                if (p.startsWith(workspace + path.sep)) {
                    return p.substring(workspace.length + 1);
                }
                return path.join('external', p);
            }
            // Create the $pwd/node_modules directory that node will resolve from
            yield symlink(rootDir, 'node_modules');
            process.chdir(rootDir);
            // Symlinks to packages need to reach back to the workspace/runfiles directory
            const workspaceRelative = path.relative('.', workspaceDir);
            const runfilesRelative = runfiles.dir ? path.relative('.', runfiles.dir) : undefined;
            // Now add symlinks to each of our first-party packages so they appear under the node_modules tree
            const links = [];
            const linkModule = (name, modulePath) => __awaiter(this, void 0, void 0, function* () {
                let target;
                // Look in the runfiles first
                // TODO: this could be a method in the Runfiles class
                if (runfiles.manifest) {
                    target = runfiles.lookupDirectory(modulePath);
                }
                else if (runfilesRelative) {
                    target = path.join(runfilesRelative, modulePath);
                }
                // It sucks that we have to do a FS call here.
                // TODO: could we know which packages are statically linked??
                if (!target || !(yield exists(target))) {
                    // Try the execroot
                    target = path.join(workspaceRelative, toWorkspaceDir(modulePath));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua19ub2RlX21vZHVsZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC9saW5rZXIvbGlua19ub2RlX21vZHVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFBOzs7O09BSUc7SUFDSCx5QkFBeUI7SUFDekIsNkJBQTZCO0lBRTdCLGdFQUFnRTtJQUNoRSxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUVuRCxTQUFTLFdBQVcsQ0FBQyxHQUFHLENBQVc7UUFDakMsSUFBSSxZQUFZO1lBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxTQUFTLEtBQUssQ0FBQyxDQUFTO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUM7Ozs7OztJQU1kLENBQUM7R0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBZSxPQUFPLENBQUMsTUFBYyxFQUFFLElBQVk7O1lBQ2pELFdBQVcsQ0FBQyxZQUFZLElBQUksT0FBTyxNQUFNLElBQUksQ0FBQyxDQUFDO1lBQy9DLHVFQUF1RTtZQUN2RSx3REFBd0Q7WUFDeEQsSUFBSTtnQkFDRixNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7YUFDckQ7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO29CQUN2QixNQUFNLENBQUMsQ0FBQztpQkFDVDtnQkFDRCx3RUFBd0U7Z0JBQ3hFLDJFQUEyRTtnQkFDM0UsNEVBQTRFO2FBQzdFO1lBRUQsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLDBDQUEwQztnQkFDMUMsMkVBQTJFO2dCQUMzRSx3QkFBd0I7Z0JBQ3hC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QUM7aUJBQ25FO2dCQUVELE1BQU0sT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5QixDQUFDLENBQUEsQ0FBQTtZQUVELEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDcEMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDdkM7WUFFRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFekIsT0FBTyxDQUFDLENBQUM7UUFDWCxDQUFDO0tBQUE7SUFuRUQsb0JBbUVDO0lBRUQsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtRQUMzQixDQUFDLEdBQVMsRUFBRTtZQUNWLE9BQU8sQ0FBQyxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQSxDQUFDLEVBQUUsQ0FBQztLQUNOIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IENyZWF0ZXMgYSBub2RlX21vZHVsZXMgZGlyZWN0b3J5IGluIHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG4gKiBhbmQgc3ltbGlua3MgaW4gdGhlIG5vZGUgbW9kdWxlcyBuZWVkZWQgdG8gcnVuIGEgcHJvZ3JhbS5cbiAqIFRoaXMgcmVwbGFjZXMgdGhlIG5lZWQgZm9yIGN1c3RvbSBtb2R1bGUgcmVzb2x1dGlvbiBsb2dpYyBpbnNpZGUgdGhlIHByb2Nlc3MuXG4gKi9cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbi8vIFJ1biBCYXplbCB3aXRoIC0tZGVmaW5lPVZFUkJPU0VfTE9HUz0xIHRvIGVuYWJsZSB0aGlzIGxvZ2dpbmdcbmNvbnN0IFZFUkJPU0VfTE9HUyA9ICEhcHJvY2Vzcy5lbnZbJ1ZFUkJPU0VfTE9HUyddO1xuXG5mdW5jdGlvbiBsb2dfdmVyYm9zZSguLi5tOiBzdHJpbmdbXSkge1xuICBpZiAoVkVSQk9TRV9MT0dTKSBjb25zb2xlLmVycm9yKCdbbGlua19ub2RlX21vZHVsZXMuanNdJywgLi4ubSk7XG59XG5cbmZ1bmN0aW9uIHBhbmljKG06IHN0cmluZykge1xuICB0aHJvdyBuZXcgRXJyb3IoYEludGVybmFsIGVycm9yISBQbGVhc2UgcnVuIGFnYWluIHdpdGhcbiAgIC0tZGVmaW5lPVZFUkJPU0VfTE9HPTFcbmFuZCBmaWxlIGFuIGlzc3VlOiBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9ydWxlc19ub2RlanMvaXNzdWVzL25ldz90ZW1wbGF0ZT1idWdfcmVwb3J0Lm1kXG5JbmNsdWRlIGFzIG11Y2ggb2YgdGhlIGJ1aWxkIG91dHB1dCBhcyB5b3UgY2FuIHdpdGhvdXQgZGlzY2xvc2luZyBhbnl0aGluZyBjb25maWRlbnRpYWwuXG5cbiAgRXJyb3I6XG4gICR7bX1cbiAgYCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHN5bWxpbmsodGFyZ2V0OiBzdHJpbmcsIHBhdGg6IHN0cmluZykge1xuICBsb2dfdmVyYm9zZShgc3ltbGluayggJHtwYXRofSAtPiAke3RhcmdldH0gKWApO1xuICAvLyBVc2UganVuY3Rpb24gb24gV2luZG93cyBzaW5jZSBzeW1saW5rcyByZXF1aXJlIGVsZXZhdGVkIHBlcm1pc3Npb25zLlxuICAvLyBXZSBvbmx5IGxpbmsgdG8gZGlyZWN0b3JpZXMgc28ganVuY3Rpb25zIHdvcmsgZm9yIHVzLlxuICB0cnkge1xuICAgIGF3YWl0IGZzLnByb21pc2VzLnN5bWxpbmsodGFyZ2V0LCBwYXRoLCAnanVuY3Rpb24nKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlLmNvZGUgIT09ICdFRVhJU1QnKSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgICAvLyBXZSBhc3N1bWUgaGVyZSB0aGF0IHRoZSBwYXRoIGlzIGFscmVhZHkgbGlua2VkIHRvIHRoZSBjb3JyZWN0IHRhcmdldC5cbiAgICAvLyBDb3VsZCBhZGQgc29tZSBsb2dpYyB0aGF0IGFzc2VydHMgaXQgaGVyZSwgYnV0IHdlIHdhbnQgdG8gYXZvaWQgYW4gZXh0cmFcbiAgICAvLyBmaWxlc3lzdGVtIGFjY2VzcyBzbyB3ZSBzaG91bGQgb25seSBkbyBpdCB1bmRlciBzb21lIGtpbmQgb2Ygc3RyaWN0IG1vZGUuXG4gIH1cblxuICBpZiAoVkVSQk9TRV9MT0dTKSB7XG4gICAgLy8gQmUgdmVyYm9zZSBhYm91dCBjcmVhdGluZyBhIGJhZCBzeW1saW5rXG4gICAgLy8gTWF5YmUgdGhpcyBzaG91bGQgZmFpbCBpbiBwcm9kdWN0aW9uIGFzIHdlbGwsIGJ1dCBhZ2FpbiB3ZSB3YW50IHRvIGF2b2lkXG4gICAgLy8gYW55IHVubmVlZGVkIGZpbGUgSS9PXG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKHBhdGgpKSB7XG4gICAgICBsb2dfdmVyYm9zZShcbiAgICAgICAgICAnRVJST1JcXG4qKipcXG5Mb29rcyBsaWtlIHdlIGNyZWF0ZWQgYSBiYWQgc3ltbGluazonICtcbiAgICAgICAgICBgXFxuICBwd2QgJHtwcm9jZXNzLmN3ZCgpfVxcbiAgdGFyZ2V0ICR7dGFyZ2V0fVxcbioqKmApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJlc29sdmUgYSByb290IGRpcmVjdG9yeSBzdHJpbmcgdG8gdGhlIGFjdHVhbCBsb2NhdGlvbiBvbiBkaXNrXG4gKiB3aGVyZSBub2RlX21vZHVsZXMgd2FzIGluc3RhbGxlZFxuICogQHBhcmFtIHJvb3QgYSBzdHJpbmcgbGlrZSAnbnBtL25vZGVfbW9kdWxlcydcbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVJvb3Qocm9vdDogc3RyaW5nfHVuZGVmaW5lZCwgcnVuZmlsZXM6IFJ1bmZpbGVzKSB7XG4gIC8vIGNyZWF0ZSBhIG5vZGVfbW9kdWxlcyBkaXJlY3RvcnkgaWYgbm8gcm9vdFxuICAvLyB0aGlzIHdpbGwgYmUgdGhlIGNhc2UgaWYgb25seSBmaXJzdC1wYXJ0eSBtb2R1bGVzIGFyZSBpbnN0YWxsZWRcbiAgaWYgKCFyb290KSB7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgbG9nX3ZlcmJvc2UoJ25vIHRoaXJkLXBhcnR5IHBhY2thZ2VzOyBta2RpciBub2RlX21vZHVsZXMgaW4gJywgcHJvY2Vzcy5jd2QoKSk7XG4gICAgICBmcy5ta2RpclN5bmMoJ25vZGVfbW9kdWxlcycpO1xuICAgIH1cbiAgICByZXR1cm4gJ25vZGVfbW9kdWxlcyc7XG4gIH1cblxuICAvLyBJZiB3ZSBnb3QgYSBydW5maWxlc01hbmlmZXN0IG1hcCwgbG9vayB0aHJvdWdoIGl0IGZvciBhIHJlc29sdXRpb25cbiAgLy8gVGhpcyB3aWxsIGhhcHBlbiBpZiB3ZSBhcmUgcnVubmluZyBhIGJpbmFyeSB0aGF0IGhhZCBzb21lIG5wbSBwYWNrYWdlc1xuICAvLyBcInN0YXRpY2FsbHkgbGlua2VkXCIgaW50byBpdHMgcnVuZmlsZXNcbiAgY29uc3QgZnJvbU1hbmlmZXN0ID0gcnVuZmlsZXMubG9va3VwRGlyZWN0b3J5KHJvb3QpO1xuICBpZiAoZnJvbU1hbmlmZXN0KSByZXR1cm4gZnJvbU1hbmlmZXN0O1xuXG4gIC8vIEFjY291bnQgZm9yIEJhemVsIC0tbGVnYWN5X2V4dGVybmFsX3J1bmZpbGVzXG4gIC8vIHdoaWNoIGxvb2sgbGlrZSAnbXlfd2tzcC9leHRlcm5hbC9ucG0vbm9kZV9tb2R1bGVzJ1xuICBpZiAoZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCkpKSB7XG4gICAgbG9nX3ZlcmJvc2UoJ0ZvdW5kIGxlZ2FjeV9leHRlcm5hbF9ydW5maWxlcywgc3dpdGNoaW5nIHJvb3QgdG8nLCBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCkpO1xuICAgIHJldHVybiBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCk7XG4gIH1cblxuICAvLyBUaGUgcmVwb3NpdG9yeSBzaG91bGQgYmUgbGF5ZWQgb3V0IGluIHRoZSBwYXJlbnQgZGlyZWN0b3J5XG4gIC8vIHNpbmNlIGJhemVsIHNldHMgb3VyIHdvcmtpbmcgZGlyZWN0b3J5IHRvIHRoZSByZXBvc2l0b3J5IHdoZXJlIHRoZSBidWlsZCBpcyBoYXBwZW5pbmdcbiAgcmV0dXJuIHBhdGguam9pbignLi4nLCByb290KTtcbn1cblxuZXhwb3J0IGNsYXNzIFJ1bmZpbGVzIHtcbiAgbWFuaWZlc3Q6IE1hcDxzdHJpbmcsIHN0cmluZz58dW5kZWZpbmVkO1xuICBkaXI6IHN0cmluZ3x1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgLy8gSWYgQmF6ZWwgc2V0cyBhIHZhcmlhYmxlIHBvaW50aW5nIHRvIGEgcnVuZmlsZXMgbWFuaWZlc3QsXG4gICAgLy8gd2UnbGwgYWx3YXlzIHVzZSBpdC5cbiAgICAvLyBOb3RlIHRoYXQgdGhpcyBoYXMgYSBzbGlnaHQgcGVyZm9ybWFuY2UgaW1wbGljYXRpb24gb24gTWFjL0xpbnV4XG4gICAgLy8gd2hlcmUgd2UgY291bGQgdXNlIHRoZSBydW5maWxlcyB0cmVlIGFscmVhZHkgbGFpZCBvdXQgb24gZGlza1xuICAgIC8vIGJ1dCB0aGlzIGp1c3QgY29zdHMgb25lIGZpbGUgcmVhZCBmb3IgdGhlIGV4dGVybmFsIG5wbS9ub2RlX21vZHVsZXNcbiAgICAvLyBhbmQgb25lIGZvciBlYWNoIGZpcnN0LXBhcnR5IG1vZHVsZSwgbm90IG9uZSBwZXIgZmlsZS5cbiAgICBpZiAoISFwcm9jZXNzLmVudlsnUlVORklMRVNfTUFOSUZFU1RfRklMRSddKSB7XG4gICAgICB0aGlzLm1hbmlmZXN0ID0gdGhpcy5sb2FkUnVuZmlsZXNNYW5pZmVzdChwcm9jZXNzLmVudlsnUlVORklMRVNfTUFOSUZFU1RfRklMRSddISk7XG4gICAgfSBlbHNlIGlmICghIXByb2Nlc3MuZW52WydSVU5GSUxFU19ESVInXSkge1xuICAgICAgdGhpcy5kaXIgPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5lbnZbJ1JVTkZJTEVTX0RJUiddISk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhbmljKFxuICAgICAgICAgICdFdmVyeSBub2RlIHByb2dyYW0gcnVuIHVuZGVyIEJhemVsIG11c3QgaGF2ZSBhICRSVU5GSUxFU19ESVIgb3IgJFJVTkZJTEVTX01BTklGRVNUX0ZJTEUgZW52aXJvbm1lbnQgdmFyaWFibGUnKTtcbiAgICB9XG4gICAgLy8gVW5kZXIgLS1ub2VuYWJsZV9ydW5maWxlcyAoaW4gcGFydGljdWxhciBvbiBXaW5kb3dzKVxuICAgIC8vIEJhemVsIHNldHMgUlVORklMRVNfTUFOSUZFU1RfT05MWT0xLlxuICAgIC8vIFdoZW4gdGhpcyBoYXBwZW5zLCB3ZSBuZWVkIHRvIHJlYWQgdGhlIG1hbmlmZXN0IGZpbGUgdG8gbG9jYXRlXG4gICAgLy8gaW5wdXRzXG4gICAgaWYgKHByb2Nlc3MuZW52WydSVU5GSUxFU19NQU5JRkVTVF9PTkxZJ10gPT09ICcxJyAmJiAhcHJvY2Vzcy5lbnZbJ1JVTkZJTEVTX01BTklGRVNUX0ZJTEUnXSkge1xuICAgICAgbG9nX3ZlcmJvc2UoYFdvcmthcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvYmF6ZWwvaXNzdWVzLzc5OTRcbiAgICAgICAgICAgICAgICAgUlVORklMRVNfTUFOSUZFU1RfRklMRSBzaG91bGQgaGF2ZSBiZWVuIHNldCBidXQgd2Fzbid0LlxuICAgICAgICAgICAgICAgICBmYWxsaW5nIGJhY2sgdG8gdXNpbmcgcnVuZmlsZXMgc3ltbGlua3MuXG4gICAgICAgICAgICAgICAgIElmIHlvdSB3YW50IHRvIHRlc3QgcnVuZmlsZXMgbWFuaWZlc3QgYmVoYXZpb3IsIGFkZFxuICAgICAgICAgICAgICAgICAtLXNwYXduX3N0cmF0ZWd5PXN0YW5kYWxvbmUgdG8gdGhlIGNvbW1hbmQgbGluZS5gKTtcbiAgICB9XG4gIH1cblxuICBsb29rdXBEaXJlY3RvcnkoZGlyOiBzdHJpbmcpOiBzdHJpbmd8dW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMubWFuaWZlc3QpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiB0aGlzLm1hbmlmZXN0KSB7XG4gICAgICAvLyBBY2NvdW50IGZvciBCYXplbCAtLWxlZ2FjeV9leHRlcm5hbF9ydW5maWxlc1xuICAgICAgLy8gd2hpY2ggcG9sbHV0ZXMgdGhlIHdvcmtzcGFjZSB3aXRoICdteV93a3NwL2V4dGVybmFsLy4uLidcbiAgICAgIGlmIChrLnN0YXJ0c1dpdGgoYCR7ZGlyfS9leHRlcm5hbGApKSBjb250aW51ZTtcblxuICAgICAgLy8gRW50cnkgbG9va3MgbGlrZVxuICAgICAgLy8gazogbnBtL25vZGVfbW9kdWxlcy9zZW12ZXIvTElDRU5TRVxuICAgICAgLy8gdjogL3BhdGgvdG8vZXh0ZXJuYWwvbnBtL25vZGVfbW9kdWxlcy9zZW12ZXIvTElDRU5TRVxuICAgICAgLy8gY2FsY3VsYXRlIGwgPSBsZW5ndGgoYC9zZW12ZXIvTElDRU5TRWApXG4gICAgICBpZiAoay5zdGFydHNXaXRoKGRpcikpIHtcbiAgICAgICAgY29uc3QgbCA9IGsubGVuZ3RoIC0gZGlyLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHYuc3Vic3RyaW5nKDAsIHYubGVuZ3RoIC0gbCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cblxuICAvKipcbiAgICogVGhlIHJ1bmZpbGVzIG1hbmlmZXN0IG1hcHMgZnJvbSBzaG9ydF9wYXRoXG4gICAqIGh0dHBzOi8vZG9jcy5iYXplbC5idWlsZC92ZXJzaW9ucy9tYXN0ZXIvc2t5bGFyay9saWIvRmlsZS5odG1sI3Nob3J0X3BhdGhcbiAgICogdG8gdGhlIGFjdHVhbCBsb2NhdGlvbiBvbiBkaXNrIHdoZXJlIHRoZSBmaWxlIGNhbiBiZSByZWFkLlxuICAgKlxuICAgKiBJbiBhIHNhbmRib3hlZCBleGVjdXRpb24sIGl0IGRvZXMgbm90IGV4aXN0LiBJbiB0aGF0IGNhc2UsIHJ1bmZpbGVzIG11c3QgYmVcbiAgICogcmVzb2x2ZWQgZnJvbSBhIHN5bWxpbmsgdHJlZSB1bmRlciB0aGUgcnVuZmlsZXMgZGlyLlxuICAgKiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvYmF6ZWwvaXNzdWVzLzM3MjZcbiAgICovXG4gIGxvYWRSdW5maWxlc01hbmlmZXN0KG1hbmlmZXN0UGF0aDogc3RyaW5nKSB7XG4gICAgbG9nX3ZlcmJvc2UoYHVzaW5nIHJ1bmZpbGVzIG1hbmlmZXN0ICR7bWFuaWZlc3RQYXRofWApO1xuXG4gICAgY29uc3QgcnVuZmlsZXNFbnRyaWVzID0gbmV3IE1hcCgpO1xuICAgIGNvbnN0IGlucHV0ID0gZnMucmVhZEZpbGVTeW5jKG1hbmlmZXN0UGF0aCwge2VuY29kaW5nOiAndXRmLTgnfSk7XG5cbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgaW5wdXQuc3BsaXQoJ1xcbicpKSB7XG4gICAgICBpZiAoIWxpbmUpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgW3J1bmZpbGVzUGF0aCwgcmVhbFBhdGhdID0gbGluZS5zcGxpdCgnICcpO1xuICAgICAgcnVuZmlsZXNFbnRyaWVzLnNldChydW5maWxlc1BhdGgsIHJlYWxQYXRoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcnVuZmlsZXNFbnRyaWVzO1xuICB9XG59XG5cbi8vIFR5cGVTY3JpcHQgbGliLmVzNS5kLnRzIGhhcyBhIG1pc3Rha2U6IEpTT04ucGFyc2UgZG9lcyBhY2NlcHQgQnVmZmVyLlxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgSlNPTiB7XG4gICAgcGFyc2UoYjoge3RvU3RyaW5nOiAoKSA9PiBzdHJpbmd9KTogYW55O1xuICB9XG59XG5cbi8vIFRoZXJlIGlzIG5vIGZzLnByb21pc2VzLmV4aXN0cyBmdW5jdGlvbiBiZWNhdXNlXG4vLyBub2RlIGNvcmUgaXMgb2YgdGhlIG9waW5pb24gdGhhdCBleGlzdHMgaXMgYWx3YXlzIHRvbyByYWNleSB0byByZWx5IG9uLlxuYXN5bmMgZnVuY3Rpb24gZXhpc3RzKHA6IHN0cmluZykge1xuICB0cnkge1xuICAgIGF3YWl0IGZzLnByb21pc2VzLnN0YXQocClcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1haW4oYXJnczogc3RyaW5nW10sIHJ1bmZpbGVzOiBSdW5maWxlcykge1xuICBpZiAoIWFyZ3MgfHwgYXJncy5sZW5ndGggPCAxKVxuICAgIHRocm93IG5ldyBFcnJvcignbGlua19ub2RlX21vZHVsZXMuanMgcmVxdWlyZXMgb25lIGFyZ3VtZW50OiBtb2R1bGVzTWFuaWZlc3QgcGF0aCcpO1xuXG4gIGNvbnN0IFttb2R1bGVzTWFuaWZlc3RdID0gYXJncztcbiAgbGV0IHtyb290LCBtb2R1bGVzLCB3b3Jrc3BhY2V9ID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMobW9kdWxlc01hbmlmZXN0KSk7XG4gIG1vZHVsZXMgPSBtb2R1bGVzIHx8IHt9O1xuICBsb2dfdmVyYm9zZShcbiAgICAgIGBtb2R1bGUgbWFuaWZlc3Q6IHdvcmtzcGFjZSAke3dvcmtzcGFjZX0sIHJvb3QgJHtyb290fSB3aXRoIGZpcnN0LXBhcnR5IHBhY2thZ2VzXFxuYCwgbW9kdWxlcyk7XG5cbiAgY29uc3Qgcm9vdERpciA9IHJlc29sdmVSb290KHJvb3QsIHJ1bmZpbGVzKTtcbiAgbG9nX3ZlcmJvc2UoJ3Jlc29sdmVkIHJvb3QnLCByb290LCAndG8nLCByb290RGlyKTtcblxuICAvLyBCYXplbCBzdGFydHMgYWN0aW9ucyB3aXRoIHB3ZD1leGVjcm9vdC9teV93a3NwXG4gIGNvbnN0IHdvcmtzcGFjZURpciA9IHBhdGgucmVzb2x2ZSgnLicpO1xuXG4gIC8vIENvbnZlcnQgZnJvbSBydW5maWxlcyBwYXRoXG4gIC8vIHRoaXNfd2tzcC9wYXRoL3RvL2ZpbGUgT1Igb3RoZXJfd2tzcC9wYXRoL3RvL2ZpbGVcbiAgLy8gdG8gZXhlY3Jvb3QgcGF0aFxuICAvLyBwYXRoL3RvL2ZpbGUgT1IgZXh0ZXJuYWwvb3RoZXJfd2tzcC9wYXRoL3RvL2ZpbGVcbiAgZnVuY3Rpb24gdG9Xb3Jrc3BhY2VEaXIocDogc3RyaW5nKSB7XG4gICAgaWYgKHAuc3RhcnRzV2l0aCh3b3Jrc3BhY2UgKyBwYXRoLnNlcCkpIHtcbiAgICAgIHJldHVybiBwLnN1YnN0cmluZyh3b3Jrc3BhY2UubGVuZ3RoICsgMSk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcCk7XG4gIH1cblxuICAvLyBDcmVhdGUgdGhlICRwd2Qvbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSB0aGF0IG5vZGUgd2lsbCByZXNvbHZlIGZyb21cbiAgYXdhaXQgc3ltbGluayhyb290RGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gIHByb2Nlc3MuY2hkaXIocm9vdERpcik7XG5cbiAgLy8gU3ltbGlua3MgdG8gcGFja2FnZXMgbmVlZCB0byByZWFjaCBiYWNrIHRvIHRoZSB3b3Jrc3BhY2UvcnVuZmlsZXMgZGlyZWN0b3J5XG4gIGNvbnN0IHdvcmtzcGFjZVJlbGF0aXZlID0gcGF0aC5yZWxhdGl2ZSgnLicsIHdvcmtzcGFjZURpcik7XG4gIGNvbnN0IHJ1bmZpbGVzUmVsYXRpdmUgPSBydW5maWxlcy5kaXIgPyBwYXRoLnJlbGF0aXZlKCcuJywgcnVuZmlsZXMuZGlyKSA6IHVuZGVmaW5lZDtcblxuICAvLyBOb3cgYWRkIHN5bWxpbmtzIHRvIGVhY2ggb2Ygb3VyIGZpcnN0LXBhcnR5IHBhY2thZ2VzIHNvIHRoZXkgYXBwZWFyIHVuZGVyIHRoZSBub2RlX21vZHVsZXMgdHJlZVxuICBjb25zdCBsaW5rcyA9IFtdO1xuXG4gIGNvbnN0IGxpbmtNb2R1bGUgPVxuICAgICAgYXN5bmMgKG5hbWU6IHN0cmluZywgbW9kdWxlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgbGV0IHRhcmdldDogc3RyaW5nfHVuZGVmaW5lZDtcblxuICAgIC8vIExvb2sgaW4gdGhlIHJ1bmZpbGVzIGZpcnN0XG4gICAgLy8gVE9ETzogdGhpcyBjb3VsZCBiZSBhIG1ldGhvZCBpbiB0aGUgUnVuZmlsZXMgY2xhc3NcbiAgICBpZiAocnVuZmlsZXMubWFuaWZlc3QpIHtcbiAgICAgIHRhcmdldCA9IHJ1bmZpbGVzLmxvb2t1cERpcmVjdG9yeShtb2R1bGVQYXRoKTtcbiAgICB9IGVsc2UgaWYgKHJ1bmZpbGVzUmVsYXRpdmUpIHtcbiAgICAgIHRhcmdldCA9IHBhdGguam9pbihydW5maWxlc1JlbGF0aXZlLCBtb2R1bGVQYXRoKTtcbiAgICB9XG5cbiAgICAvLyBJdCBzdWNrcyB0aGF0IHdlIGhhdmUgdG8gZG8gYSBGUyBjYWxsIGhlcmUuXG4gICAgLy8gVE9ETzogY291bGQgd2Uga25vdyB3aGljaCBwYWNrYWdlcyBhcmUgc3RhdGljYWxseSBsaW5rZWQ/P1xuICAgIGlmICghdGFyZ2V0IHx8ICFhd2FpdCBleGlzdHModGFyZ2V0KSkge1xuICAgICAgLy8gVHJ5IHRoZSBleGVjcm9vdFxuICAgICAgdGFyZ2V0ID0gcGF0aC5qb2luKHdvcmtzcGFjZVJlbGF0aXZlLCB0b1dvcmtzcGFjZURpcihtb2R1bGVQYXRoKSk7XG4gICAgfVxuXG4gICAgYXdhaXQgc3ltbGluayh0YXJnZXQsIG5hbWUpO1xuICB9XG5cbiAgZm9yIChjb25zdCBtIG9mIE9iamVjdC5rZXlzKG1vZHVsZXMpKSB7XG4gICAgbGlua3MucHVzaChsaW5rTW9kdWxlKG0sIG1vZHVsZXNbbV0pKTtcbiAgfVxuXG4gIGF3YWl0IFByb21pc2UuYWxsKGxpbmtzKTtcblxuICByZXR1cm4gMDtcbn1cblxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIChhc3luYyAoKSA9PiB7XG4gICAgcHJvY2Vzcy5leGl0Q29kZSA9IGF3YWl0IG1haW4ocHJvY2Vzcy5hcmd2LnNsaWNlKDIpLCBuZXcgUnVuZmlsZXMoKSk7XG4gIH0pKCk7XG59XG4iXX0=
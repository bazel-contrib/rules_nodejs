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
                if (e.code !== 'ENOENT') {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua19ub2RlX21vZHVsZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC9saW5rZXIvbGlua19ub2RlX21vZHVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFBOzs7O09BSUc7SUFDSCx5QkFBeUI7SUFDekIsNkJBQTZCO0lBRTdCLGdFQUFnRTtJQUNoRSxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUVuRCxTQUFTLFdBQVcsQ0FBQyxHQUFHLENBQVc7UUFDakMsSUFBSSxZQUFZO1lBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxTQUFTLEtBQUssQ0FBQyxDQUFTO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUM7Ozs7OztJQU1kLENBQUM7R0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBZSxPQUFPLENBQUMsTUFBYyxFQUFFLElBQVk7O1lBQ2pELFdBQVcsQ0FBQyxZQUFZLElBQUksT0FBTyxNQUFNLElBQUksQ0FBQyxDQUFDO1lBQy9DLHVFQUF1RTtZQUN2RSx3REFBd0Q7WUFDeEQsSUFBRztnQkFDRCxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7YUFDckQ7WUFBQyxPQUFNLENBQUMsRUFBQztnQkFDUixJQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFDO29CQUNyQixNQUFNLENBQUMsQ0FBQztpQkFDVDtnQkFDRCx3RUFBd0U7Z0JBQ3hFLDJFQUEyRTtnQkFDM0UsNEVBQTRFO2FBQzdFO1lBRUQsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLDBDQUEwQztnQkFDMUMsMkVBQTJFO2dCQUMzRSx3QkFBd0I7Z0JBQ3hC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LENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNwQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTthQUNyQztZQUVELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUV6QixPQUFPLENBQUMsQ0FBQztRQUNYLENBQUM7S0FBQTtJQWxFRCxvQkFrRUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO1FBQzFCLENBQUMsR0FBUSxFQUFFO1lBQ1YsT0FBTyxDQUFDLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQyxDQUFBLENBQUMsRUFBRSxDQUFDO0tBQ1AiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgQ3JlYXRlcyBhIG5vZGVfbW9kdWxlcyBkaXJlY3RvcnkgaW4gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAqIGFuZCBzeW1saW5rcyBpbiB0aGUgbm9kZSBtb2R1bGVzIG5lZWRlZCB0byBydW4gYSBwcm9ncmFtLlxuICogVGhpcyByZXBsYWNlcyB0aGUgbmVlZCBmb3IgY3VzdG9tIG1vZHVsZSByZXNvbHV0aW9uIGxvZ2ljIGluc2lkZSB0aGUgcHJvY2Vzcy5cbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gUnVuIEJhemVsIHdpdGggLS1kZWZpbmU9VkVSQk9TRV9MT0dTPTEgdG8gZW5hYmxlIHRoaXMgbG9nZ2luZ1xuY29uc3QgVkVSQk9TRV9MT0dTID0gISFwcm9jZXNzLmVudlsnVkVSQk9TRV9MT0dTJ107XG5cbmZ1bmN0aW9uIGxvZ192ZXJib3NlKC4uLm06IHN0cmluZ1tdKSB7XG4gIGlmIChWRVJCT1NFX0xPR1MpIGNvbnNvbGUuZXJyb3IoJ1tsaW5rX25vZGVfbW9kdWxlcy5qc10nLCAuLi5tKTtcbn1cblxuZnVuY3Rpb24gcGFuaWMobTogc3RyaW5nKSB7XG4gIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgZXJyb3IhIFBsZWFzZSBydW4gYWdhaW4gd2l0aFxuICAgLS1kZWZpbmU9VkVSQk9TRV9MT0c9MVxuYW5kIGZpbGUgYW4gaXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9pc3N1ZXMvbmV3P3RlbXBsYXRlPWJ1Z19yZXBvcnQubWRcbkluY2x1ZGUgYXMgbXVjaCBvZiB0aGUgYnVpbGQgb3V0cHV0IGFzIHlvdSBjYW4gd2l0aG91dCBkaXNjbG9zaW5nIGFueXRoaW5nIGNvbmZpZGVudGlhbC5cblxuICBFcnJvcjpcbiAgJHttfVxuICBgKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc3ltbGluayh0YXJnZXQ6IHN0cmluZywgcGF0aDogc3RyaW5nKSB7XG4gIGxvZ192ZXJib3NlKGBzeW1saW5rKCAke3BhdGh9IC0+ICR7dGFyZ2V0fSApYCk7XG4gIC8vIFVzZSBqdW5jdGlvbiBvbiBXaW5kb3dzIHNpbmNlIHN5bWxpbmtzIHJlcXVpcmUgZWxldmF0ZWQgcGVybWlzc2lvbnMuXG4gIC8vIFdlIG9ubHkgbGluayB0byBkaXJlY3RvcmllcyBzbyBqdW5jdGlvbnMgd29yayBmb3IgdXMuXG4gIHRyeXtcbiAgICBhd2FpdCBmcy5wcm9taXNlcy5zeW1saW5rKHRhcmdldCwgcGF0aCwgJ2p1bmN0aW9uJyk7XG4gIH0gY2F0Y2goZSl7XG4gICAgaWYoZS5jb2RlICE9PSAnRU5PRU5UJyl7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgICAvLyBXZSBhc3N1bWUgaGVyZSB0aGF0IHRoZSBwYXRoIGlzIGFscmVhZHkgbGlua2VkIHRvIHRoZSBjb3JyZWN0IHRhcmdldC5cbiAgICAvLyBDb3VsZCBhZGQgc29tZSBsb2dpYyB0aGF0IGFzc2VydHMgaXQgaGVyZSwgYnV0IHdlIHdhbnQgdG8gYXZvaWQgYW4gZXh0cmFcbiAgICAvLyBmaWxlc3lzdGVtIGFjY2VzcyBzbyB3ZSBzaG91bGQgb25seSBkbyBpdCB1bmRlciBzb21lIGtpbmQgb2Ygc3RyaWN0IG1vZGUuXG4gIH1cblxuICBpZiAoVkVSQk9TRV9MT0dTKSB7XG4gICAgLy8gQmUgdmVyYm9zZSBhYm91dCBjcmVhdGluZyBhIGJhZCBzeW1saW5rXG4gICAgLy8gTWF5YmUgdGhpcyBzaG91bGQgZmFpbCBpbiBwcm9kdWN0aW9uIGFzIHdlbGwsIGJ1dCBhZ2FpbiB3ZSB3YW50IHRvIGF2b2lkXG4gICAgLy8gYW55IHVubmVlZGVkIGZpbGUgSS9PXG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKHBhdGgpKSB7XG4gICAgICBsb2dfdmVyYm9zZShcbiAgICAgICAgICAnRVJST1JcXG4qKipcXG5Mb29rcyBsaWtlIHdlIGNyZWF0ZWQgYSBiYWQgc3ltbGluazonICtcbiAgICAgICAgICBgXFxuICBwd2QgJHtwcm9jZXNzLmN3ZCgpfVxcbiAgdGFyZ2V0ICR7dGFyZ2V0fVxcbioqKmApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJlc29sdmUgYSByb290IGRpcmVjdG9yeSBzdHJpbmcgdG8gdGhlIGFjdHVhbCBsb2NhdGlvbiBvbiBkaXNrXG4gKiB3aGVyZSBub2RlX21vZHVsZXMgd2FzIGluc3RhbGxlZFxuICogQHBhcmFtIHJvb3QgYSBzdHJpbmcgbGlrZSAnbnBtL25vZGVfbW9kdWxlcydcbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVJvb3Qocm9vdDogc3RyaW5nfHVuZGVmaW5lZCwgcnVuZmlsZXM6IFJ1bmZpbGVzKSB7XG4gIC8vIGNyZWF0ZSBhIG5vZGVfbW9kdWxlcyBkaXJlY3RvcnkgaWYgbm8gcm9vdFxuICAvLyB0aGlzIHdpbGwgYmUgdGhlIGNhc2UgaWYgb25seSBmaXJzdC1wYXJ0eSBtb2R1bGVzIGFyZSBpbnN0YWxsZWRcbiAgaWYgKCFyb290KSB7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgbG9nX3ZlcmJvc2UoJ25vIHRoaXJkLXBhcnR5IHBhY2thZ2VzOyBta2RpciBub2RlX21vZHVsZXMgaW4gJywgcHJvY2Vzcy5jd2QoKSk7XG4gICAgICBmcy5ta2RpclN5bmMoJ25vZGVfbW9kdWxlcycpO1xuICAgIH1cbiAgICByZXR1cm4gJ25vZGVfbW9kdWxlcyc7XG4gIH1cblxuICAvLyBJZiB3ZSBnb3QgYSBydW5maWxlc01hbmlmZXN0IG1hcCwgbG9vayB0aHJvdWdoIGl0IGZvciBhIHJlc29sdXRpb25cbiAgLy8gVGhpcyB3aWxsIGhhcHBlbiBpZiB3ZSBhcmUgcnVubmluZyBhIGJpbmFyeSB0aGF0IGhhZCBzb21lIG5wbSBwYWNrYWdlc1xuICAvLyBcInN0YXRpY2FsbHkgbGlua2VkXCIgaW50byBpdHMgcnVuZmlsZXNcbiAgY29uc3QgZnJvbU1hbmlmZXN0ID0gcnVuZmlsZXMubG9va3VwRGlyZWN0b3J5KHJvb3QpO1xuICBpZiAoZnJvbU1hbmlmZXN0KSByZXR1cm4gZnJvbU1hbmlmZXN0O1xuXG4gIC8vIEFjY291bnQgZm9yIEJhemVsIC0tbGVnYWN5X2V4dGVybmFsX3J1bmZpbGVzXG4gIC8vIHdoaWNoIGxvb2sgbGlrZSAnbXlfd2tzcC9leHRlcm5hbC9ucG0vbm9kZV9tb2R1bGVzJ1xuICBpZiAoZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCkpKSB7XG4gICAgbG9nX3ZlcmJvc2UoJ0ZvdW5kIGxlZ2FjeV9leHRlcm5hbF9ydW5maWxlcywgc3dpdGNoaW5nIHJvb3QgdG8nLCBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCkpO1xuICAgIHJldHVybiBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCk7XG4gIH1cblxuICAvLyBUaGUgcmVwb3NpdG9yeSBzaG91bGQgYmUgbGF5ZWQgb3V0IGluIHRoZSBwYXJlbnQgZGlyZWN0b3J5XG4gIC8vIHNpbmNlIGJhemVsIHNldHMgb3VyIHdvcmtpbmcgZGlyZWN0b3J5IHRvIHRoZSByZXBvc2l0b3J5IHdoZXJlIHRoZSBidWlsZCBpcyBoYXBwZW5pbmdcbiAgcmV0dXJuIHBhdGguam9pbignLi4nLCByb290KTtcbn1cblxuZXhwb3J0IGNsYXNzIFJ1bmZpbGVzIHtcbiAgbWFuaWZlc3Q6IE1hcDxzdHJpbmcsIHN0cmluZz58dW5kZWZpbmVkO1xuICBkaXI6IHN0cmluZ3x1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgLy8gSWYgQmF6ZWwgc2V0cyBhIHZhcmlhYmxlIHBvaW50aW5nIHRvIGEgcnVuZmlsZXMgbWFuaWZlc3QsXG4gICAgLy8gd2UnbGwgYWx3YXlzIHVzZSBpdC5cbiAgICAvLyBOb3RlIHRoYXQgdGhpcyBoYXMgYSBzbGlnaHQgcGVyZm9ybWFuY2UgaW1wbGljYXRpb24gb24gTWFjL0xpbnV4XG4gICAgLy8gd2hlcmUgd2UgY291bGQgdXNlIHRoZSBydW5maWxlcyB0cmVlIGFscmVhZHkgbGFpZCBvdXQgb24gZGlza1xuICAgIC8vIGJ1dCB0aGlzIGp1c3QgY29zdHMgb25lIGZpbGUgcmVhZCBmb3IgdGhlIGV4dGVybmFsIG5wbS9ub2RlX21vZHVsZXNcbiAgICAvLyBhbmQgb25lIGZvciBlYWNoIGZpcnN0LXBhcnR5IG1vZHVsZSwgbm90IG9uZSBwZXIgZmlsZS5cbiAgICBpZiAoISFwcm9jZXNzLmVudlsnUlVORklMRVNfTUFOSUZFU1RfRklMRSddKSB7XG4gICAgICB0aGlzLm1hbmlmZXN0ID0gdGhpcy5sb2FkUnVuZmlsZXNNYW5pZmVzdChwcm9jZXNzLmVudlsnUlVORklMRVNfTUFOSUZFU1RfRklMRSddISk7XG4gICAgfSBlbHNlIGlmICghIXByb2Nlc3MuZW52WydSVU5GSUxFU19ESVInXSkge1xuICAgICAgdGhpcy5kaXIgPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5lbnZbJ1JVTkZJTEVTX0RJUiddISk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhbmljKFxuICAgICAgICAgICdFdmVyeSBub2RlIHByb2dyYW0gcnVuIHVuZGVyIEJhemVsIG11c3QgaGF2ZSBhICRSVU5GSUxFU19ESVIgb3IgJFJVTkZJTEVTX01BTklGRVNUX0ZJTEUgZW52aXJvbm1lbnQgdmFyaWFibGUnKTtcbiAgICB9XG4gICAgLy8gVW5kZXIgLS1ub2VuYWJsZV9ydW5maWxlcyAoaW4gcGFydGljdWxhciBvbiBXaW5kb3dzKVxuICAgIC8vIEJhemVsIHNldHMgUlVORklMRVNfTUFOSUZFU1RfT05MWT0xLlxuICAgIC8vIFdoZW4gdGhpcyBoYXBwZW5zLCB3ZSBuZWVkIHRvIHJlYWQgdGhlIG1hbmlmZXN0IGZpbGUgdG8gbG9jYXRlXG4gICAgLy8gaW5wdXRzXG4gICAgaWYgKHByb2Nlc3MuZW52WydSVU5GSUxFU19NQU5JRkVTVF9PTkxZJ10gPT09ICcxJyAmJiAhcHJvY2Vzcy5lbnZbJ1JVTkZJTEVTX01BTklGRVNUX0ZJTEUnXSkge1xuICAgICAgbG9nX3ZlcmJvc2UoYFdvcmthcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvYmF6ZWwvaXNzdWVzLzc5OTRcbiAgICAgICAgICAgICAgICAgUlVORklMRVNfTUFOSUZFU1RfRklMRSBzaG91bGQgaGF2ZSBiZWVuIHNldCBidXQgd2Fzbid0LlxuICAgICAgICAgICAgICAgICBmYWxsaW5nIGJhY2sgdG8gdXNpbmcgcnVuZmlsZXMgc3ltbGlua3MuXG4gICAgICAgICAgICAgICAgIElmIHlvdSB3YW50IHRvIHRlc3QgcnVuZmlsZXMgbWFuaWZlc3QgYmVoYXZpb3IsIGFkZFxuICAgICAgICAgICAgICAgICAtLXNwYXduX3N0cmF0ZWd5PXN0YW5kYWxvbmUgdG8gdGhlIGNvbW1hbmQgbGluZS5gKTtcbiAgICB9XG4gIH1cblxuICBsb29rdXBEaXJlY3RvcnkoZGlyOiBzdHJpbmcpOiBzdHJpbmd8dW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMubWFuaWZlc3QpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiB0aGlzLm1hbmlmZXN0KSB7XG4gICAgICAvLyBFbnRyeSBsb29rcyBsaWtlXG4gICAgICAvLyBrOiBucG0vbm9kZV9tb2R1bGVzL3NlbXZlci9MSUNFTlNFXG4gICAgICAvLyB2OiAvcGF0aC90by9leHRlcm5hbC9ucG0vbm9kZV9tb2R1bGVzL3NlbXZlci9MSUNFTlNFXG4gICAgICAvLyBjYWxjdWxhdGUgbCA9IGxlbmd0aChgL3NlbXZlci9MSUNFTlNFYClcbiAgICAgIGlmIChrLnN0YXJ0c1dpdGgoZGlyKSkge1xuICAgICAgICBjb25zdCBsID0gay5sZW5ndGggLSBkaXIubGVuZ3RoO1xuICAgICAgICByZXR1cm4gdi5zdWJzdHJpbmcoMCwgdi5sZW5ndGggLSBsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIC8qKlxuICAgKiBUaGUgcnVuZmlsZXMgbWFuaWZlc3QgbWFwcyBmcm9tIHNob3J0X3BhdGhcbiAgICogaHR0cHM6Ly9kb2NzLmJhemVsLmJ1aWxkL3ZlcnNpb25zL21hc3Rlci9za3lsYXJrL2xpYi9GaWxlLmh0bWwjc2hvcnRfcGF0aFxuICAgKiB0byB0aGUgYWN0dWFsIGxvY2F0aW9uIG9uIGRpc2sgd2hlcmUgdGhlIGZpbGUgY2FuIGJlIHJlYWQuXG4gICAqXG4gICAqIEluIGEgc2FuZGJveGVkIGV4ZWN1dGlvbiwgaXQgZG9lcyBub3QgZXhpc3QuIEluIHRoYXQgY2FzZSwgcnVuZmlsZXMgbXVzdCBiZVxuICAgKiByZXNvbHZlZCBmcm9tIGEgc3ltbGluayB0cmVlIHVuZGVyIHRoZSBydW5maWxlcyBkaXIuXG4gICAqIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9iYXplbC9pc3N1ZXMvMzcyNlxuICAgKi9cbiAgbG9hZFJ1bmZpbGVzTWFuaWZlc3QobWFuaWZlc3RQYXRoOiBzdHJpbmcpIHtcbiAgICBsb2dfdmVyYm9zZShgdXNpbmcgcnVuZmlsZXMgbWFuaWZlc3QgJHttYW5pZmVzdFBhdGh9YCk7XG5cbiAgICBjb25zdCBydW5maWxlc0VudHJpZXMgPSBuZXcgTWFwKCk7XG4gICAgY29uc3QgaW5wdXQgPSBmcy5yZWFkRmlsZVN5bmMobWFuaWZlc3RQYXRoLCB7ZW5jb2Rpbmc6ICd1dGYtOCd9KTtcblxuICAgIGZvciAoY29uc3QgbGluZSBvZiBpbnB1dC5zcGxpdCgnXFxuJykpIHtcbiAgICAgIGlmICghbGluZSkgY29udGludWU7XG4gICAgICBjb25zdCBbcnVuZmlsZXNQYXRoLCByZWFsUGF0aF0gPSBsaW5lLnNwbGl0KCcgJyk7XG4gICAgICBydW5maWxlc0VudHJpZXMuc2V0KHJ1bmZpbGVzUGF0aCwgcmVhbFBhdGgpO1xuICAgIH1cblxuICAgIHJldHVybiBydW5maWxlc0VudHJpZXM7XG4gIH1cbn1cblxuLy8gVHlwZVNjcmlwdCBsaWIuZXM1LmQudHMgaGFzIGEgbWlzdGFrZTogSlNPTi5wYXJzZSBkb2VzIGFjY2VwdCBCdWZmZXIuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBKU09OIHtcbiAgICBwYXJzZShiOiB7dG9TdHJpbmc6KCk9PnN0cmluZ30pOiBhbnk7XG4gIH1cbn1cblxuLy8gVGhlcmUgaXMgbm8gZnMucHJvbWlzZXMuZXhpc3RzIGZ1bmN0aW9uIGJlY2F1c2UgXG4vLyBub2RlIGNvcmUgaXMgb2YgdGhlIG9waW5pb24gdGhhdCBleGlzdHMgaXMgYWx3YXlzIHRvbyByYWNleSB0byByZWx5IG9uLlxuYXN5bmMgZnVuY3Rpb24gZXhpc3RzKHA6c3RyaW5nKXtcbiAgdHJ5e1xuICAgIGF3YWl0IGZzLnByb21pc2VzLnN0YXQocClcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaChlKXtcbiAgICBpZihlLmNvZGUgPT09ICdFTk9FTlQnKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihhcmdzOiBzdHJpbmdbXSwgcnVuZmlsZXM6IFJ1bmZpbGVzKSB7XG4gIGlmICghYXJncyB8fCBhcmdzLmxlbmd0aCA8IDEpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdsaW5rX25vZGVfbW9kdWxlcy5qcyByZXF1aXJlcyBvbmUgYXJndW1lbnQ6IG1vZHVsZXNNYW5pZmVzdCBwYXRoJyk7XG5cbiAgY29uc3QgW21vZHVsZXNNYW5pZmVzdF0gPSBhcmdzO1xuICBsZXQge3Jvb3QsIG1vZHVsZXMsIHdvcmtzcGFjZX0gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhtb2R1bGVzTWFuaWZlc3QpKTtcbiAgbW9kdWxlcyA9IG1vZHVsZXMgfHwge307XG4gIGxvZ192ZXJib3NlKFxuICAgICAgYG1vZHVsZSBtYW5pZmVzdDogd29ya3NwYWNlICR7d29ya3NwYWNlfSwgcm9vdCAke3Jvb3R9IHdpdGggZmlyc3QtcGFydHkgcGFja2FnZXNcXG5gLCBtb2R1bGVzKTtcblxuICBjb25zdCByb290RGlyID0gcmVzb2x2ZVJvb3Qocm9vdCwgcnVuZmlsZXMpO1xuICBsb2dfdmVyYm9zZSgncmVzb2x2ZWQgcm9vdCcsIHJvb3QsICd0bycsIHJvb3REaXIpO1xuXG4gIC8vIEJhemVsIHN0YXJ0cyBhY3Rpb25zIHdpdGggcHdkPWV4ZWNyb290L215X3drc3BcbiAgY29uc3Qgd29ya3NwYWNlRGlyID0gcGF0aC5yZXNvbHZlKCcuJyk7XG5cbiAgLy8gQ29udmVydCBmcm9tIHJ1bmZpbGVzIHBhdGhcbiAgLy8gdGhpc193a3NwL3BhdGgvdG8vZmlsZSBPUiBvdGhlcl93a3NwL3BhdGgvdG8vZmlsZVxuICAvLyB0byBleGVjcm9vdCBwYXRoXG4gIC8vIHBhdGgvdG8vZmlsZSBPUiBleHRlcm5hbC9vdGhlcl93a3NwL3BhdGgvdG8vZmlsZVxuICBmdW5jdGlvbiB0b1dvcmtzcGFjZURpcihwOiBzdHJpbmcpIHtcbiAgICBpZiAocC5zdGFydHNXaXRoKHdvcmtzcGFjZSArIHBhdGguc2VwKSkge1xuICAgICAgcmV0dXJuIHAuc3Vic3RyaW5nKHdvcmtzcGFjZS5sZW5ndGggKyAxKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGguam9pbignZXh0ZXJuYWwnLCBwKTtcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgJHB3ZC9ub2RlX21vZHVsZXMgZGlyZWN0b3J5IHRoYXQgbm9kZSB3aWxsIHJlc29sdmUgZnJvbVxuICBhd2FpdCBzeW1saW5rKHJvb3REaXIsICdub2RlX21vZHVsZXMnKTtcbiAgcHJvY2Vzcy5jaGRpcihyb290RGlyKTtcblxuICAvLyBTeW1saW5rcyB0byBwYWNrYWdlcyBuZWVkIHRvIHJlYWNoIGJhY2sgdG8gdGhlIHdvcmtzcGFjZS9ydW5maWxlcyBkaXJlY3RvcnlcbiAgY29uc3Qgd29ya3NwYWNlUmVsYXRpdmUgPSBwYXRoLnJlbGF0aXZlKCcuJywgd29ya3NwYWNlRGlyKTtcbiAgY29uc3QgcnVuZmlsZXNSZWxhdGl2ZSA9IHJ1bmZpbGVzLmRpciA/IHBhdGgucmVsYXRpdmUoJy4nLCBydW5maWxlcy5kaXIpIDogdW5kZWZpbmVkO1xuXG4gIC8vIE5vdyBhZGQgc3ltbGlua3MgdG8gZWFjaCBvZiBvdXIgZmlyc3QtcGFydHkgcGFja2FnZXMgc28gdGhleSBhcHBlYXIgdW5kZXIgdGhlIG5vZGVfbW9kdWxlcyB0cmVlXG4gIGNvbnN0IGxpbmtzID0gW11cblxuICBjb25zdCBsaW5rTW9kdWxlID0gYXN5bmMgKG5hbWU6c3RyaW5nLG1vZHVsZVBhdGg6c3RyaW5nKT0+e1xuICAgIGxldCB0YXJnZXQ6IHN0cmluZ3x1bmRlZmluZWQ7XG5cbiAgICAvLyBMb29rIGluIHRoZSBydW5maWxlcyBmaXJzdFxuICAgIC8vIFRPRE86IHRoaXMgY291bGQgYmUgYSBtZXRob2QgaW4gdGhlIFJ1bmZpbGVzIGNsYXNzXG4gICAgaWYgKHJ1bmZpbGVzLm1hbmlmZXN0KSB7XG4gICAgICB0YXJnZXQgPSBydW5maWxlcy5sb29rdXBEaXJlY3RvcnkobW9kdWxlUGF0aCk7XG4gICAgfSBlbHNlIGlmIChydW5maWxlc1JlbGF0aXZlKSB7XG4gICAgICB0YXJnZXQgPSBwYXRoLmpvaW4ocnVuZmlsZXNSZWxhdGl2ZSwgbW9kdWxlUGF0aCk7XG4gICAgfVxuXG4gICAgLy8gSXQgc3Vja3MgdGhhdCB3ZSBoYXZlIHRvIGRvIGEgRlMgY2FsbCBoZXJlLlxuICAgIC8vIFRPRE86IGNvdWxkIHdlIGtub3cgd2hpY2ggcGFja2FnZXMgYXJlIHN0YXRpY2FsbHkgbGlua2VkPz9cbiAgICBpZiAoIXRhcmdldCB8fCAhYXdhaXQgZXhpc3RzKHRhcmdldCkpIHtcbiAgICAgIC8vIFRyeSB0aGUgZXhlY3Jvb3RcbiAgICAgIHRhcmdldCA9IHBhdGguam9pbih3b3Jrc3BhY2VSZWxhdGl2ZSwgdG9Xb3Jrc3BhY2VEaXIobW9kdWxlUGF0aCkpO1xuICAgIH1cblxuICAgIGF3YWl0IHN5bWxpbmsodGFyZ2V0LCBuYW1lKTtcbiAgfVxuXG4gIGZvciAoY29uc3QgbSBvZiBPYmplY3Qua2V5cyhtb2R1bGVzKSkge1xuICAgIGxpbmtzLnB1c2gobGlua01vZHVsZShtLG1vZHVsZXNbbV0pKVxuICB9XG5cbiAgYXdhaXQgUHJvbWlzZS5hbGwobGlua3MpO1xuXG4gIHJldHVybiAwO1xufVxuXG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgIChhc3luYyAoKT0+e1xuICAgIHByb2Nlc3MuZXhpdENvZGUgPSBhd2FpdCBtYWluKHByb2Nlc3MuYXJndi5zbGljZSgyKSwgbmV3IFJ1bmZpbGVzKCkpO1xuICAgfSkoKTtcbn1cblxuIl19
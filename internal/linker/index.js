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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua19ub2RlX21vZHVsZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC9saW5rZXIvbGlua19ub2RlX21vZHVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFBOzs7O09BSUc7SUFDSCx5QkFBeUI7SUFDekIsNkJBQTZCO0lBRTdCLGdFQUFnRTtJQUNoRSxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUVuRCxTQUFTLFdBQVcsQ0FBQyxHQUFHLENBQVc7UUFDakMsSUFBSSxZQUFZO1lBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxTQUFTLEtBQUssQ0FBQyxDQUFTO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUM7Ozs7OztJQU1kLENBQUM7R0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBZSxPQUFPLENBQUMsTUFBYyxFQUFFLElBQVk7O1lBQ2pELFdBQVcsQ0FBQyxZQUFZLElBQUksT0FBTyxNQUFNLElBQUksQ0FBQyxDQUFDO1lBQy9DLHVFQUF1RTtZQUN2RSx3REFBd0Q7WUFDeEQsSUFBSTtnQkFDRixNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7YUFDckQ7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO29CQUN2QixNQUFNLENBQUMsQ0FBQztpQkFDVDtnQkFDRCx3RUFBd0U7Z0JBQ3hFLDJFQUEyRTtnQkFDM0UsNEVBQTRFO2FBQzdFO1lBRUQsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLDBDQUEwQztnQkFDMUMsMkVBQTJFO2dCQUMzRSx3QkFBd0I7Z0JBQ3hC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QUcsRUFBRSxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDdkUsSUFBSSxDQUFDLENBQUEsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUEsRUFBRTt3QkFDekIsbUJBQW1CO3dCQUNuQixNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztxQkFDbkU7aUJBQ0Y7Z0JBRUQsTUFBTSxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlCLENBQUMsQ0FBQSxDQUFBO1lBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNwQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN2QztZQUVELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUV6QixPQUFPLENBQUMsQ0FBQztRQUNYLENBQUM7S0FBQTtJQTFFRCxvQkEwRUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO1FBQzNCLENBQUMsR0FBUyxFQUFFO1lBQ1YsT0FBTyxDQUFDLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFBLENBQUMsRUFBRSxDQUFDO0tBQ04iLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgQ3JlYXRlcyBhIG5vZGVfbW9kdWxlcyBkaXJlY3RvcnkgaW4gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAqIGFuZCBzeW1saW5rcyBpbiB0aGUgbm9kZSBtb2R1bGVzIG5lZWRlZCB0byBydW4gYSBwcm9ncmFtLlxuICogVGhpcyByZXBsYWNlcyB0aGUgbmVlZCBmb3IgY3VzdG9tIG1vZHVsZSByZXNvbHV0aW9uIGxvZ2ljIGluc2lkZSB0aGUgcHJvY2Vzcy5cbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gUnVuIEJhemVsIHdpdGggLS1kZWZpbmU9VkVSQk9TRV9MT0dTPTEgdG8gZW5hYmxlIHRoaXMgbG9nZ2luZ1xuY29uc3QgVkVSQk9TRV9MT0dTID0gISFwcm9jZXNzLmVudlsnVkVSQk9TRV9MT0dTJ107XG5cbmZ1bmN0aW9uIGxvZ192ZXJib3NlKC4uLm06IHN0cmluZ1tdKSB7XG4gIGlmIChWRVJCT1NFX0xPR1MpIGNvbnNvbGUuZXJyb3IoJ1tsaW5rX25vZGVfbW9kdWxlcy5qc10nLCAuLi5tKTtcbn1cblxuZnVuY3Rpb24gcGFuaWMobTogc3RyaW5nKSB7XG4gIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgZXJyb3IhIFBsZWFzZSBydW4gYWdhaW4gd2l0aFxuICAgLS1kZWZpbmU9VkVSQk9TRV9MT0c9MVxuYW5kIGZpbGUgYW4gaXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9pc3N1ZXMvbmV3P3RlbXBsYXRlPWJ1Z19yZXBvcnQubWRcbkluY2x1ZGUgYXMgbXVjaCBvZiB0aGUgYnVpbGQgb3V0cHV0IGFzIHlvdSBjYW4gd2l0aG91dCBkaXNjbG9zaW5nIGFueXRoaW5nIGNvbmZpZGVudGlhbC5cblxuICBFcnJvcjpcbiAgJHttfVxuICBgKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc3ltbGluayh0YXJnZXQ6IHN0cmluZywgcGF0aDogc3RyaW5nKSB7XG4gIGxvZ192ZXJib3NlKGBzeW1saW5rKCAke3BhdGh9IC0+ICR7dGFyZ2V0fSApYCk7XG4gIC8vIFVzZSBqdW5jdGlvbiBvbiBXaW5kb3dzIHNpbmNlIHN5bWxpbmtzIHJlcXVpcmUgZWxldmF0ZWQgcGVybWlzc2lvbnMuXG4gIC8vIFdlIG9ubHkgbGluayB0byBkaXJlY3RvcmllcyBzbyBqdW5jdGlvbnMgd29yayBmb3IgdXMuXG4gIHRyeSB7XG4gICAgYXdhaXQgZnMucHJvbWlzZXMuc3ltbGluayh0YXJnZXQsIHBhdGgsICdqdW5jdGlvbicpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUuY29kZSAhPT0gJ0VFWElTVCcpIHtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICAgIC8vIFdlIGFzc3VtZSBoZXJlIHRoYXQgdGhlIHBhdGggaXMgYWxyZWFkeSBsaW5rZWQgdG8gdGhlIGNvcnJlY3QgdGFyZ2V0LlxuICAgIC8vIENvdWxkIGFkZCBzb21lIGxvZ2ljIHRoYXQgYXNzZXJ0cyBpdCBoZXJlLCBidXQgd2Ugd2FudCB0byBhdm9pZCBhbiBleHRyYVxuICAgIC8vIGZpbGVzeXN0ZW0gYWNjZXNzIHNvIHdlIHNob3VsZCBvbmx5IGRvIGl0IHVuZGVyIHNvbWUga2luZCBvZiBzdHJpY3QgbW9kZS5cbiAgfVxuXG4gIGlmIChWRVJCT1NFX0xPR1MpIHtcbiAgICAvLyBCZSB2ZXJib3NlIGFib3V0IGNyZWF0aW5nIGEgYmFkIHN5bWxpbmtcbiAgICAvLyBNYXliZSB0aGlzIHNob3VsZCBmYWlsIGluIHByb2R1Y3Rpb24gYXMgd2VsbCwgYnV0IGFnYWluIHdlIHdhbnQgdG8gYXZvaWRcbiAgICAvLyBhbnkgdW5uZWVkZWQgZmlsZSBJL09cbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgIGxvZ192ZXJib3NlKFxuICAgICAgICAgICdFUlJPUlxcbioqKlxcbkxvb2tzIGxpa2Ugd2UgY3JlYXRlZCBhIGJhZCBzeW1saW5rOicgK1xuICAgICAgICAgIGBcXG4gIHB3ZCAke3Byb2Nlc3MuY3dkKCl9XFxuICB0YXJnZXQgJHt0YXJnZXR9XFxuKioqYCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmVzb2x2ZSBhIHJvb3QgZGlyZWN0b3J5IHN0cmluZyB0byB0aGUgYWN0dWFsIGxvY2F0aW9uIG9uIGRpc2tcbiAqIHdoZXJlIG5vZGVfbW9kdWxlcyB3YXMgaW5zdGFsbGVkXG4gKiBAcGFyYW0gcm9vdCBhIHN0cmluZyBsaWtlICducG0vbm9kZV9tb2R1bGVzJ1xuICovXG5mdW5jdGlvbiByZXNvbHZlUm9vdChyb290OiBzdHJpbmd8dW5kZWZpbmVkLCBydW5maWxlczogUnVuZmlsZXMpIHtcbiAgLy8gY3JlYXRlIGEgbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSBpZiBubyByb290XG4gIC8vIHRoaXMgd2lsbCBiZSB0aGUgY2FzZSBpZiBvbmx5IGZpcnN0LXBhcnR5IG1vZHVsZXMgYXJlIGluc3RhbGxlZFxuICBpZiAoIXJvb3QpIHtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICBsb2dfdmVyYm9zZSgnbm8gdGhpcmQtcGFydHkgcGFja2FnZXM7IG1rZGlyIG5vZGVfbW9kdWxlcyBpbiAnLCBwcm9jZXNzLmN3ZCgpKTtcbiAgICAgIGZzLm1rZGlyU3luYygnbm9kZV9tb2R1bGVzJyk7XG4gICAgfVxuICAgIHJldHVybiAnbm9kZV9tb2R1bGVzJztcbiAgfVxuXG4gIC8vIElmIHdlIGdvdCBhIHJ1bmZpbGVzTWFuaWZlc3QgbWFwLCBsb29rIHRocm91Z2ggaXQgZm9yIGEgcmVzb2x1dGlvblxuICAvLyBUaGlzIHdpbGwgaGFwcGVuIGlmIHdlIGFyZSBydW5uaW5nIGEgYmluYXJ5IHRoYXQgaGFkIHNvbWUgbnBtIHBhY2thZ2VzXG4gIC8vIFwic3RhdGljYWxseSBsaW5rZWRcIiBpbnRvIGl0cyBydW5maWxlc1xuICBjb25zdCBmcm9tTWFuaWZlc3QgPSBydW5maWxlcy5sb29rdXBEaXJlY3Rvcnkocm9vdCk7XG4gIGlmIChmcm9tTWFuaWZlc3QpIHJldHVybiBmcm9tTWFuaWZlc3Q7XG5cbiAgLy8gQWNjb3VudCBmb3IgQmF6ZWwgLS1sZWdhY3lfZXh0ZXJuYWxfcnVuZmlsZXNcbiAgLy8gd2hpY2ggbG9vayBsaWtlICdteV93a3NwL2V4dGVybmFsL25wbS9ub2RlX21vZHVsZXMnXG4gIGlmIChmcy5leGlzdHNTeW5jKHBhdGguam9pbignZXh0ZXJuYWwnLCByb290KSkpIHtcbiAgICBsb2dfdmVyYm9zZSgnRm91bmQgbGVnYWN5X2V4dGVybmFsX3J1bmZpbGVzLCBzd2l0Y2hpbmcgcm9vdCB0bycsIHBhdGguam9pbignZXh0ZXJuYWwnLCByb290KSk7XG4gICAgcmV0dXJuIHBhdGguam9pbignZXh0ZXJuYWwnLCByb290KTtcbiAgfVxuXG4gIC8vIFRoZSByZXBvc2l0b3J5IHNob3VsZCBiZSBsYXllZCBvdXQgaW4gdGhlIHBhcmVudCBkaXJlY3RvcnlcbiAgLy8gc2luY2UgYmF6ZWwgc2V0cyBvdXIgd29ya2luZyBkaXJlY3RvcnkgdG8gdGhlIHJlcG9zaXRvcnkgd2hlcmUgdGhlIGJ1aWxkIGlzIGhhcHBlbmluZ1xuICByZXR1cm4gcGF0aC5qb2luKCcuLicsIHJvb3QpO1xufVxuXG5leHBvcnQgY2xhc3MgUnVuZmlsZXMge1xuICBtYW5pZmVzdDogTWFwPHN0cmluZywgc3RyaW5nPnx1bmRlZmluZWQ7XG4gIGRpcjogc3RyaW5nfHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICAvLyBJZiBCYXplbCBzZXRzIGEgdmFyaWFibGUgcG9pbnRpbmcgdG8gYSBydW5maWxlcyBtYW5pZmVzdCxcbiAgICAvLyB3ZSdsbCBhbHdheXMgdXNlIGl0LlxuICAgIC8vIE5vdGUgdGhhdCB0aGlzIGhhcyBhIHNsaWdodCBwZXJmb3JtYW5jZSBpbXBsaWNhdGlvbiBvbiBNYWMvTGludXhcbiAgICAvLyB3aGVyZSB3ZSBjb3VsZCB1c2UgdGhlIHJ1bmZpbGVzIHRyZWUgYWxyZWFkeSBsYWlkIG91dCBvbiBkaXNrXG4gICAgLy8gYnV0IHRoaXMganVzdCBjb3N0cyBvbmUgZmlsZSByZWFkIGZvciB0aGUgZXh0ZXJuYWwgbnBtL25vZGVfbW9kdWxlc1xuICAgIC8vIGFuZCBvbmUgZm9yIGVhY2ggZmlyc3QtcGFydHkgbW9kdWxlLCBub3Qgb25lIHBlciBmaWxlLlxuICAgIGlmICghIXByb2Nlc3MuZW52WydSVU5GSUxFU19NQU5JRkVTVF9GSUxFJ10pIHtcbiAgICAgIHRoaXMubWFuaWZlc3QgPSB0aGlzLmxvYWRSdW5maWxlc01hbmlmZXN0KHByb2Nlc3MuZW52WydSVU5GSUxFU19NQU5JRkVTVF9GSUxFJ10hKTtcbiAgICB9IGVsc2UgaWYgKCEhcHJvY2Vzcy5lbnZbJ1JVTkZJTEVTX0RJUiddKSB7XG4gICAgICB0aGlzLmRpciA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmVudlsnUlVORklMRVNfRElSJ10hKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFuaWMoXG4gICAgICAgICAgJ0V2ZXJ5IG5vZGUgcHJvZ3JhbSBydW4gdW5kZXIgQmF6ZWwgbXVzdCBoYXZlIGEgJFJVTkZJTEVTX0RJUiBvciAkUlVORklMRVNfTUFOSUZFU1RfRklMRSBlbnZpcm9ubWVudCB2YXJpYWJsZScpO1xuICAgIH1cbiAgICAvLyBVbmRlciAtLW5vZW5hYmxlX3J1bmZpbGVzIChpbiBwYXJ0aWN1bGFyIG9uIFdpbmRvd3MpXG4gICAgLy8gQmF6ZWwgc2V0cyBSVU5GSUxFU19NQU5JRkVTVF9PTkxZPTEuXG4gICAgLy8gV2hlbiB0aGlzIGhhcHBlbnMsIHdlIG5lZWQgdG8gcmVhZCB0aGUgbWFuaWZlc3QgZmlsZSB0byBsb2NhdGVcbiAgICAvLyBpbnB1dHNcbiAgICBpZiAocHJvY2Vzcy5lbnZbJ1JVTkZJTEVTX01BTklGRVNUX09OTFknXSA9PT0gJzEnICYmICFwcm9jZXNzLmVudlsnUlVORklMRVNfTUFOSUZFU1RfRklMRSddKSB7XG4gICAgICBsb2dfdmVyYm9zZShgV29ya2Fyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9iYXplbC9pc3N1ZXMvNzk5NFxuICAgICAgICAgICAgICAgICBSVU5GSUxFU19NQU5JRkVTVF9GSUxFIHNob3VsZCBoYXZlIGJlZW4gc2V0IGJ1dCB3YXNuJ3QuXG4gICAgICAgICAgICAgICAgIGZhbGxpbmcgYmFjayB0byB1c2luZyBydW5maWxlcyBzeW1saW5rcy5cbiAgICAgICAgICAgICAgICAgSWYgeW91IHdhbnQgdG8gdGVzdCBydW5maWxlcyBtYW5pZmVzdCBiZWhhdmlvciwgYWRkXG4gICAgICAgICAgICAgICAgIC0tc3Bhd25fc3RyYXRlZ3k9c3RhbmRhbG9uZSB0byB0aGUgY29tbWFuZCBsaW5lLmApO1xuICAgIH1cbiAgfVxuXG4gIGxvb2t1cERpcmVjdG9yeShkaXI6IHN0cmluZyk6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5tYW5pZmVzdCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHRoaXMubWFuaWZlc3QpIHtcbiAgICAgIC8vIEFjY291bnQgZm9yIEJhemVsIC0tbGVnYWN5X2V4dGVybmFsX3J1bmZpbGVzXG4gICAgICAvLyB3aGljaCBwb2xsdXRlcyB0aGUgd29ya3NwYWNlIHdpdGggJ215X3drc3AvZXh0ZXJuYWwvLi4uJ1xuICAgICAgaWYgKGsuc3RhcnRzV2l0aChgJHtkaXJ9L2V4dGVybmFsYCkpIGNvbnRpbnVlO1xuXG4gICAgICAvLyBFbnRyeSBsb29rcyBsaWtlXG4gICAgICAvLyBrOiBucG0vbm9kZV9tb2R1bGVzL3NlbXZlci9MSUNFTlNFXG4gICAgICAvLyB2OiAvcGF0aC90by9leHRlcm5hbC9ucG0vbm9kZV9tb2R1bGVzL3NlbXZlci9MSUNFTlNFXG4gICAgICAvLyBjYWxjdWxhdGUgbCA9IGxlbmd0aChgL3NlbXZlci9MSUNFTlNFYClcbiAgICAgIGlmIChrLnN0YXJ0c1dpdGgoZGlyKSkge1xuICAgICAgICBjb25zdCBsID0gay5sZW5ndGggLSBkaXIubGVuZ3RoO1xuICAgICAgICByZXR1cm4gdi5zdWJzdHJpbmcoMCwgdi5sZW5ndGggLSBsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIC8qKlxuICAgKiBUaGUgcnVuZmlsZXMgbWFuaWZlc3QgbWFwcyBmcm9tIHNob3J0X3BhdGhcbiAgICogaHR0cHM6Ly9kb2NzLmJhemVsLmJ1aWxkL3ZlcnNpb25zL21hc3Rlci9za3lsYXJrL2xpYi9GaWxlLmh0bWwjc2hvcnRfcGF0aFxuICAgKiB0byB0aGUgYWN0dWFsIGxvY2F0aW9uIG9uIGRpc2sgd2hlcmUgdGhlIGZpbGUgY2FuIGJlIHJlYWQuXG4gICAqXG4gICAqIEluIGEgc2FuZGJveGVkIGV4ZWN1dGlvbiwgaXQgZG9lcyBub3QgZXhpc3QuIEluIHRoYXQgY2FzZSwgcnVuZmlsZXMgbXVzdCBiZVxuICAgKiByZXNvbHZlZCBmcm9tIGEgc3ltbGluayB0cmVlIHVuZGVyIHRoZSBydW5maWxlcyBkaXIuXG4gICAqIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9iYXplbC9pc3N1ZXMvMzcyNlxuICAgKi9cbiAgbG9hZFJ1bmZpbGVzTWFuaWZlc3QobWFuaWZlc3RQYXRoOiBzdHJpbmcpIHtcbiAgICBsb2dfdmVyYm9zZShgdXNpbmcgcnVuZmlsZXMgbWFuaWZlc3QgJHttYW5pZmVzdFBhdGh9YCk7XG5cbiAgICBjb25zdCBydW5maWxlc0VudHJpZXMgPSBuZXcgTWFwKCk7XG4gICAgY29uc3QgaW5wdXQgPSBmcy5yZWFkRmlsZVN5bmMobWFuaWZlc3RQYXRoLCB7ZW5jb2Rpbmc6ICd1dGYtOCd9KTtcblxuICAgIGZvciAoY29uc3QgbGluZSBvZiBpbnB1dC5zcGxpdCgnXFxuJykpIHtcbiAgICAgIGlmICghbGluZSkgY29udGludWU7XG4gICAgICBjb25zdCBbcnVuZmlsZXNQYXRoLCByZWFsUGF0aF0gPSBsaW5lLnNwbGl0KCcgJyk7XG4gICAgICBydW5maWxlc0VudHJpZXMuc2V0KHJ1bmZpbGVzUGF0aCwgcmVhbFBhdGgpO1xuICAgIH1cblxuICAgIHJldHVybiBydW5maWxlc0VudHJpZXM7XG4gIH1cbn1cblxuLy8gVHlwZVNjcmlwdCBsaWIuZXM1LmQudHMgaGFzIGEgbWlzdGFrZTogSlNPTi5wYXJzZSBkb2VzIGFjY2VwdCBCdWZmZXIuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBKU09OIHtcbiAgICBwYXJzZShiOiB7dG9TdHJpbmc6ICgpID0+IHN0cmluZ30pOiBhbnk7XG4gIH1cbn1cblxuLy8gVGhlcmUgaXMgbm8gZnMucHJvbWlzZXMuZXhpc3RzIGZ1bmN0aW9uIGJlY2F1c2Vcbi8vIG5vZGUgY29yZSBpcyBvZiB0aGUgb3BpbmlvbiB0aGF0IGV4aXN0cyBpcyBhbHdheXMgdG9vIHJhY2V5IHRvIHJlbHkgb24uXG5hc3luYyBmdW5jdGlvbiBleGlzdHMocDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgYXdhaXQgZnMucHJvbWlzZXMuc3RhdChwKVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihhcmdzOiBzdHJpbmdbXSwgcnVuZmlsZXM6IFJ1bmZpbGVzKSB7XG4gIGlmICghYXJncyB8fCBhcmdzLmxlbmd0aCA8IDEpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdsaW5rX25vZGVfbW9kdWxlcy5qcyByZXF1aXJlcyBvbmUgYXJndW1lbnQ6IG1vZHVsZXNNYW5pZmVzdCBwYXRoJyk7XG5cbiAgY29uc3QgW21vZHVsZXNNYW5pZmVzdF0gPSBhcmdzO1xuICBsZXQge2Jpbiwgcm9vdCwgbW9kdWxlcywgd29ya3NwYWNlfSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1vZHVsZXNNYW5pZmVzdCkpO1xuICBtb2R1bGVzID0gbW9kdWxlcyB8fCB7fTtcbiAgbG9nX3ZlcmJvc2UoXG4gICAgICBgbW9kdWxlIG1hbmlmZXN0OiB3b3Jrc3BhY2UgJHt3b3Jrc3BhY2V9LCBiaW4gJHtiaW59LCByb290ICR7XG4gICAgICAgICAgcm9vdH0gd2l0aCBmaXJzdC1wYXJ0eSBwYWNrYWdlc1xcbmAsXG4gICAgICBtb2R1bGVzKTtcblxuICBjb25zdCByb290RGlyID0gcmVzb2x2ZVJvb3Qocm9vdCwgcnVuZmlsZXMpO1xuICBsb2dfdmVyYm9zZSgncmVzb2x2ZWQgcm9vdCcsIHJvb3QsICd0bycsIHJvb3REaXIpO1xuXG4gIC8vIEJhemVsIHN0YXJ0cyBhY3Rpb25zIHdpdGggcHdkPWV4ZWNyb290L215X3drc3BcbiAgY29uc3Qgd29ya3NwYWNlRGlyID0gcGF0aC5yZXNvbHZlKCcuJyk7XG5cbiAgLy8gQ29udmVydCBmcm9tIHJ1bmZpbGVzIHBhdGhcbiAgLy8gdGhpc193a3NwL3BhdGgvdG8vZmlsZSBPUiBvdGhlcl93a3NwL3BhdGgvdG8vZmlsZVxuICAvLyB0byBleGVjcm9vdCBwYXRoXG4gIC8vIHBhdGgvdG8vZmlsZSBPUiBleHRlcm5hbC9vdGhlcl93a3NwL3BhdGgvdG8vZmlsZVxuICBmdW5jdGlvbiB0b1dvcmtzcGFjZURpcihwOiBzdHJpbmcpIHtcbiAgICAvLyBUaGUgbWFuaWZlc3QgaXMgd3JpdHRlbiB3aXRoIGZvcndhcmQgc2xhc2ggb24gYWxsIHBsYXRmb3Jtc1xuICAgIGlmIChwLnN0YXJ0c1dpdGgod29ya3NwYWNlICsgJy8nKSkge1xuICAgICAgcmV0dXJuIHAuc3Vic3RyaW5nKHdvcmtzcGFjZS5sZW5ndGggKyAxKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGguam9pbignZXh0ZXJuYWwnLCBwKTtcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgJHB3ZC9ub2RlX21vZHVsZXMgZGlyZWN0b3J5IHRoYXQgbm9kZSB3aWxsIHJlc29sdmUgZnJvbVxuICBhd2FpdCBzeW1saW5rKHJvb3REaXIsICdub2RlX21vZHVsZXMnKTtcbiAgcHJvY2Vzcy5jaGRpcihyb290RGlyKTtcblxuICAvLyBTeW1saW5rcyB0byBwYWNrYWdlcyBuZWVkIHRvIHJlYWNoIGJhY2sgdG8gdGhlIHdvcmtzcGFjZS9ydW5maWxlcyBkaXJlY3RvcnlcbiAgY29uc3Qgd29ya3NwYWNlUmVsYXRpdmUgPSBwYXRoLnJlbGF0aXZlKCcuJywgd29ya3NwYWNlRGlyKTtcbiAgY29uc3QgcnVuZmlsZXNSZWxhdGl2ZSA9IHJ1bmZpbGVzLmRpciA/IHBhdGgucmVsYXRpdmUoJy4nLCBydW5maWxlcy5kaXIpIDogdW5kZWZpbmVkO1xuXG4gIC8vIE5vdyBhZGQgc3ltbGlua3MgdG8gZWFjaCBvZiBvdXIgZmlyc3QtcGFydHkgcGFja2FnZXMgc28gdGhleSBhcHBlYXIgdW5kZXIgdGhlIG5vZGVfbW9kdWxlcyB0cmVlXG4gIGNvbnN0IGxpbmtzID0gW107XG5cbiAgY29uc3QgbGlua01vZHVsZSA9XG4gICAgICBhc3luYyAobmFtZTogc3RyaW5nLCBtb2R1bGVQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBsZXQgdGFyZ2V0OiBzdHJpbmd8dW5kZWZpbmVkO1xuXG4gICAgLy8gTG9vayBpbiB0aGUgcnVuZmlsZXMgZmlyc3RcbiAgICAvLyBUT0RPOiB0aGlzIGNvdWxkIGJlIGEgbWV0aG9kIGluIHRoZSBSdW5maWxlcyBjbGFzc1xuICAgIGlmIChydW5maWxlcy5tYW5pZmVzdCkge1xuICAgICAgdGFyZ2V0ID0gcnVuZmlsZXMubG9va3VwRGlyZWN0b3J5KG1vZHVsZVBhdGgpO1xuICAgIH0gZWxzZSBpZiAocnVuZmlsZXNSZWxhdGl2ZSkge1xuICAgICAgdGFyZ2V0ID0gcGF0aC5qb2luKHJ1bmZpbGVzUmVsYXRpdmUsIG1vZHVsZVBhdGgpO1xuICAgIH1cblxuICAgIC8vIEl0IHN1Y2tzIHRoYXQgd2UgaGF2ZSB0byBkbyBhIEZTIGNhbGwgaGVyZS5cbiAgICAvLyBUT0RPOiBjb3VsZCB3ZSBrbm93IHdoaWNoIHBhY2thZ2VzIGFyZSBzdGF0aWNhbGx5IGxpbmtlZD8/XG4gICAgaWYgKCF0YXJnZXQgfHwgIWF3YWl0IGV4aXN0cyh0YXJnZXQpKSB7XG4gICAgICAvLyBUcnkgdGhlIGJpbiBkaXJcbiAgICAgIHRhcmdldCA9IHBhdGguam9pbih3b3Jrc3BhY2VSZWxhdGl2ZSwgYmluLCB0b1dvcmtzcGFjZURpcihtb2R1bGVQYXRoKSk7XG4gICAgICBpZiAoIWF3YWl0IGV4aXN0cyh0YXJnZXQpKSB7XG4gICAgICAgIC8vIFRyeSB0aGUgZXhlY3Jvb3RcbiAgICAgICAgdGFyZ2V0ID0gcGF0aC5qb2luKHdvcmtzcGFjZVJlbGF0aXZlLCB0b1dvcmtzcGFjZURpcihtb2R1bGVQYXRoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXdhaXQgc3ltbGluayh0YXJnZXQsIG5hbWUpO1xuICB9XG5cbiAgZm9yIChjb25zdCBtIG9mIE9iamVjdC5rZXlzKG1vZHVsZXMpKSB7XG4gICAgbGlua3MucHVzaChsaW5rTW9kdWxlKG0sIG1vZHVsZXNbbV0pKTtcbiAgfVxuXG4gIGF3YWl0IFByb21pc2UuYWxsKGxpbmtzKTtcblxuICByZXR1cm4gMDtcbn1cblxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIChhc3luYyAoKSA9PiB7XG4gICAgcHJvY2Vzcy5leGl0Q29kZSA9IGF3YWl0IG1haW4ocHJvY2Vzcy5hcmd2LnNsaWNlKDIpLCBuZXcgUnVuZmlsZXMoKSk7XG4gIH0pKCk7XG59XG4iXX0=
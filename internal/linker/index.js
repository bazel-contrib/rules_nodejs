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
                        // Spend an extra FS lookup to give better error in this case
                        if (!(yield exists(target))) {
                            // TODO: there should be some docs explaining how users are
                            // expected to declare ahead of time where the package is loaded,
                            // how that relates to npm link scenarios,
                            // and where the configuration can go.
                            return Promise.reject(`ERROR: no output directory found for package ${modulePath}
        Did you mean to declare this as a from-source package?
        See https://github.com/bazelbuild/rules_nodejs/pull/1197
        until this feature is properly documented.`);
                        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua19ub2RlX21vZHVsZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC9saW5rZXIvbGlua19ub2RlX21vZHVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFBOzs7O09BSUc7SUFDSCx5QkFBeUI7SUFDekIsNkJBQTZCO0lBRTdCLGdFQUFnRTtJQUNoRSxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUVuRCxTQUFTLFdBQVcsQ0FBQyxHQUFHLENBQVc7UUFDakMsSUFBSSxZQUFZO1lBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxTQUFTLEtBQUssQ0FBQyxDQUFTO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUM7Ozs7OztJQU1kLENBQUM7R0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBUyxNQUFNLENBQUMsQ0FBUztRQUN2QixJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNyQixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakI7SUFDSCxDQUFDO0lBRUQsU0FBZSxPQUFPLENBQUMsTUFBYyxFQUFFLElBQVk7O1lBQ2pELFdBQVcsQ0FBQyxZQUFZLElBQUksT0FBTyxNQUFNLElBQUksQ0FBQyxDQUFDO1lBQy9DLHVFQUF1RTtZQUN2RSx3REFBd0Q7WUFDeEQsSUFBSTtnQkFDRixNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7YUFDckQ7WUFB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QUFDLENBQUM7WUFDWCxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztLQUFBO0lBN0ZELG9CQTZGQztJQUVZLFFBQUEsUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVsRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO1FBQzNCLENBQUMsR0FBUyxFQUFFO1lBQ1YsT0FBTyxDQUFDLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBUSxDQUFDLENBQUM7UUFDakUsQ0FBQyxDQUFBLENBQUMsRUFBRSxDQUFDO0tBQ04iLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgQ3JlYXRlcyBhIG5vZGVfbW9kdWxlcyBkaXJlY3RvcnkgaW4gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAqIGFuZCBzeW1saW5rcyBpbiB0aGUgbm9kZSBtb2R1bGVzIG5lZWRlZCB0byBydW4gYSBwcm9ncmFtLlxuICogVGhpcyByZXBsYWNlcyB0aGUgbmVlZCBmb3IgY3VzdG9tIG1vZHVsZSByZXNvbHV0aW9uIGxvZ2ljIGluc2lkZSB0aGUgcHJvY2Vzcy5cbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gUnVuIEJhemVsIHdpdGggLS1kZWZpbmU9VkVSQk9TRV9MT0dTPTEgdG8gZW5hYmxlIHRoaXMgbG9nZ2luZ1xuY29uc3QgVkVSQk9TRV9MT0dTID0gISFwcm9jZXNzLmVudlsnVkVSQk9TRV9MT0dTJ107XG5cbmZ1bmN0aW9uIGxvZ192ZXJib3NlKC4uLm06IHN0cmluZ1tdKSB7XG4gIGlmIChWRVJCT1NFX0xPR1MpIGNvbnNvbGUuZXJyb3IoJ1tsaW5rX25vZGVfbW9kdWxlcy5qc10nLCAuLi5tKTtcbn1cblxuZnVuY3Rpb24gcGFuaWMobTogc3RyaW5nKSB7XG4gIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgZXJyb3IhIFBsZWFzZSBydW4gYWdhaW4gd2l0aFxuICAgLS1kZWZpbmU9VkVSQk9TRV9MT0c9MVxuYW5kIGZpbGUgYW4gaXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9pc3N1ZXMvbmV3P3RlbXBsYXRlPWJ1Z19yZXBvcnQubWRcbkluY2x1ZGUgYXMgbXVjaCBvZiB0aGUgYnVpbGQgb3V0cHV0IGFzIHlvdSBjYW4gd2l0aG91dCBkaXNjbG9zaW5nIGFueXRoaW5nIGNvbmZpZGVudGlhbC5cblxuICBFcnJvcjpcbiAgJHttfVxuICBgKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgZGlyZWN0b3J5IGFuZCBhbnkgbmVjZXNzYXJ5IHN1YmRpcmVjdG9yaWVzXG4gKiBpZiB0aGV5IGRvIG5vdCBleGlzdC5cbiAqL1xuZnVuY3Rpb24gbWtkaXJwKHA6IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMocCkpIHtcbiAgICBta2RpcnAocGF0aC5kaXJuYW1lKHApKTtcbiAgICBmcy5ta2RpclN5bmMocCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gc3ltbGluayh0YXJnZXQ6IHN0cmluZywgcGF0aDogc3RyaW5nKSB7XG4gIGxvZ192ZXJib3NlKGBzeW1saW5rKCAke3BhdGh9IC0+ICR7dGFyZ2V0fSApYCk7XG4gIC8vIFVzZSBqdW5jdGlvbiBvbiBXaW5kb3dzIHNpbmNlIHN5bWxpbmtzIHJlcXVpcmUgZWxldmF0ZWQgcGVybWlzc2lvbnMuXG4gIC8vIFdlIG9ubHkgbGluayB0byBkaXJlY3RvcmllcyBzbyBqdW5jdGlvbnMgd29yayBmb3IgdXMuXG4gIHRyeSB7XG4gICAgYXdhaXQgZnMucHJvbWlzZXMuc3ltbGluayh0YXJnZXQsIHBhdGgsICdqdW5jdGlvbicpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUuY29kZSAhPT0gJ0VFWElTVCcpIHtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICAgIC8vIFdlIGFzc3VtZSBoZXJlIHRoYXQgdGhlIHBhdGggaXMgYWxyZWFkeSBsaW5rZWQgdG8gdGhlIGNvcnJlY3QgdGFyZ2V0LlxuICAgIC8vIENvdWxkIGFkZCBzb21lIGxvZ2ljIHRoYXQgYXNzZXJ0cyBpdCBoZXJlLCBidXQgd2Ugd2FudCB0byBhdm9pZCBhbiBleHRyYVxuICAgIC8vIGZpbGVzeXN0ZW0gYWNjZXNzIHNvIHdlIHNob3VsZCBvbmx5IGRvIGl0IHVuZGVyIHNvbWUga2luZCBvZiBzdHJpY3QgbW9kZS5cbiAgfVxuXG4gIGlmIChWRVJCT1NFX0xPR1MpIHtcbiAgICAvLyBCZSB2ZXJib3NlIGFib3V0IGNyZWF0aW5nIGEgYmFkIHN5bWxpbmtcbiAgICAvLyBNYXliZSB0aGlzIHNob3VsZCBmYWlsIGluIHByb2R1Y3Rpb24gYXMgd2VsbCwgYnV0IGFnYWluIHdlIHdhbnQgdG8gYXZvaWRcbiAgICAvLyBhbnkgdW5uZWVkZWQgZmlsZSBJL09cbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgIGxvZ192ZXJib3NlKFxuICAgICAgICAgICdFUlJPUlxcbioqKlxcbkxvb2tzIGxpa2Ugd2UgY3JlYXRlZCBhIGJhZCBzeW1saW5rOicgK1xuICAgICAgICAgIGBcXG4gIHB3ZCAke3Byb2Nlc3MuY3dkKCl9XFxuICB0YXJnZXQgJHt0YXJnZXR9XFxuICBwYXRoICR7cGF0aH1cXG4qKipgKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgcm9vdCBkaXJlY3Rvcnkgc3RyaW5nIHRvIHRoZSBhY3R1YWwgbG9jYXRpb24gb24gZGlza1xuICogd2hlcmUgbm9kZV9tb2R1bGVzIHdhcyBpbnN0YWxsZWRcbiAqIEBwYXJhbSByb290IGEgc3RyaW5nIGxpa2UgJ25wbS9ub2RlX21vZHVsZXMnXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVSb290KHJvb3Q6IHN0cmluZ3x1bmRlZmluZWQsIHJ1bmZpbGVzOiBSdW5maWxlcykge1xuICAvLyBjcmVhdGUgYSBub2RlX21vZHVsZXMgZGlyZWN0b3J5IGlmIG5vIHJvb3RcbiAgLy8gdGhpcyB3aWxsIGJlIHRoZSBjYXNlIGlmIG9ubHkgZmlyc3QtcGFydHkgbW9kdWxlcyBhcmUgaW5zdGFsbGVkXG4gIGlmICghcm9vdCkge1xuICAgIGlmICghZnMuZXhpc3RzU3luYygnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgIGxvZ192ZXJib3NlKCdubyB0aGlyZC1wYXJ0eSBwYWNrYWdlczsgbWtkaXIgbm9kZV9tb2R1bGVzIGluICcsIHByb2Nlc3MuY3dkKCkpO1xuICAgICAgZnMubWtkaXJTeW5jKCdub2RlX21vZHVsZXMnKTtcbiAgICB9XG4gICAgcmV0dXJuICdub2RlX21vZHVsZXMnO1xuICB9XG5cbiAgLy8gSWYgd2UgZ290IGEgcnVuZmlsZXNNYW5pZmVzdCBtYXAsIGxvb2sgdGhyb3VnaCBpdCBmb3IgYSByZXNvbHV0aW9uXG4gIC8vIFRoaXMgd2lsbCBoYXBwZW4gaWYgd2UgYXJlIHJ1bm5pbmcgYSBiaW5hcnkgdGhhdCBoYWQgc29tZSBucG0gcGFja2FnZXNcbiAgLy8gXCJzdGF0aWNhbGx5IGxpbmtlZFwiIGludG8gaXRzIHJ1bmZpbGVzXG4gIGNvbnN0IGZyb21NYW5pZmVzdCA9IHJ1bmZpbGVzLmxvb2t1cERpcmVjdG9yeShyb290KTtcbiAgaWYgKGZyb21NYW5pZmVzdCkgcmV0dXJuIGZyb21NYW5pZmVzdDtcblxuICAvLyBBY2NvdW50IGZvciBCYXplbCAtLWxlZ2FjeV9leHRlcm5hbF9ydW5maWxlc1xuICAvLyB3aGljaCBsb29rIGxpa2UgJ215X3drc3AvZXh0ZXJuYWwvbnBtL25vZGVfbW9kdWxlcydcbiAgaWYgKGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKCdleHRlcm5hbCcsIHJvb3QpKSkge1xuICAgIGxvZ192ZXJib3NlKCdGb3VuZCBsZWdhY3lfZXh0ZXJuYWxfcnVuZmlsZXMsIHN3aXRjaGluZyByb290IHRvJywgcGF0aC5qb2luKCdleHRlcm5hbCcsIHJvb3QpKTtcbiAgICByZXR1cm4gcGF0aC5qb2luKCdleHRlcm5hbCcsIHJvb3QpO1xuICB9XG5cbiAgLy8gVGhlIHJlcG9zaXRvcnkgc2hvdWxkIGJlIGxheWVkIG91dCBpbiB0aGUgcGFyZW50IGRpcmVjdG9yeVxuICAvLyBzaW5jZSBiYXplbCBzZXRzIG91ciB3b3JraW5nIGRpcmVjdG9yeSB0byB0aGUgcmVwb3NpdG9yeSB3aGVyZSB0aGUgYnVpbGQgaXMgaGFwcGVuaW5nXG4gIHJldHVybiBwYXRoLmpvaW4oJy4uJywgcm9vdCk7XG59XG5cbmV4cG9ydCBjbGFzcyBSdW5maWxlcyB7XG4gIG1hbmlmZXN0OiBNYXA8c3RyaW5nLCBzdHJpbmc+fHVuZGVmaW5lZDtcbiAgZGlyOiBzdHJpbmd8dW5kZWZpbmVkO1xuICAvKipcbiAgICogSWYgdGhlIGVudmlyb25tZW50IGdpdmVzIHVzIGVub3VnaCBoaW50cywgd2UgY2FuIGtub3cgdGhlIHBhdGggdG8gdGhlIHBhY2thZ2VcbiAgICogaW4gdGhlIGZvcm0gd29ya3NwYWNlX25hbWUvcGF0aC90by9wYWNrYWdlXG4gICAqL1xuICBwYWNrYWdlUGF0aDogc3RyaW5nfHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihlbnY6IHR5cGVvZiBwcm9jZXNzLmVudikge1xuICAgIC8vIElmIEJhemVsIHNldHMgYSB2YXJpYWJsZSBwb2ludGluZyB0byBhIHJ1bmZpbGVzIG1hbmlmZXN0LFxuICAgIC8vIHdlJ2xsIGFsd2F5cyB1c2UgaXQuXG4gICAgLy8gTm90ZSB0aGF0IHRoaXMgaGFzIGEgc2xpZ2h0IHBlcmZvcm1hbmNlIGltcGxpY2F0aW9uIG9uIE1hYy9MaW51eFxuICAgIC8vIHdoZXJlIHdlIGNvdWxkIHVzZSB0aGUgcnVuZmlsZXMgdHJlZSBhbHJlYWR5IGxhaWQgb3V0IG9uIGRpc2tcbiAgICAvLyBidXQgdGhpcyBqdXN0IGNvc3RzIG9uZSBmaWxlIHJlYWQgZm9yIHRoZSBleHRlcm5hbCBucG0vbm9kZV9tb2R1bGVzXG4gICAgLy8gYW5kIG9uZSBmb3IgZWFjaCBmaXJzdC1wYXJ0eSBtb2R1bGUsIG5vdCBvbmUgcGVyIGZpbGUuXG4gICAgaWYgKCEhZW52WydSVU5GSUxFU19NQU5JRkVTVF9GSUxFJ10pIHtcbiAgICAgIHRoaXMubWFuaWZlc3QgPSB0aGlzLmxvYWRSdW5maWxlc01hbmlmZXN0KGVudlsnUlVORklMRVNfTUFOSUZFU1RfRklMRSddISk7XG4gICAgfSBlbHNlIGlmICghIWVudlsnUlVORklMRVNfRElSJ10pIHtcbiAgICAgIHRoaXMuZGlyID0gcGF0aC5yZXNvbHZlKGVudlsnUlVORklMRVNfRElSJ10hKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFuaWMoXG4gICAgICAgICAgJ0V2ZXJ5IG5vZGUgcHJvZ3JhbSBydW4gdW5kZXIgQmF6ZWwgbXVzdCBoYXZlIGEgJFJVTkZJTEVTX0RJUiBvciAkUlVORklMRVNfTUFOSUZFU1RfRklMRSBlbnZpcm9ubWVudCB2YXJpYWJsZScpO1xuICAgIH1cbiAgICAvLyBVbmRlciAtLW5vZW5hYmxlX3J1bmZpbGVzIChpbiBwYXJ0aWN1bGFyIG9uIFdpbmRvd3MpXG4gICAgLy8gQmF6ZWwgc2V0cyBSVU5GSUxFU19NQU5JRkVTVF9PTkxZPTEuXG4gICAgLy8gV2hlbiB0aGlzIGhhcHBlbnMsIHdlIG5lZWQgdG8gcmVhZCB0aGUgbWFuaWZlc3QgZmlsZSB0byBsb2NhdGVcbiAgICAvLyBpbnB1dHNcbiAgICBpZiAoZW52WydSVU5GSUxFU19NQU5JRkVTVF9PTkxZJ10gPT09ICcxJyAmJiAhZW52WydSVU5GSUxFU19NQU5JRkVTVF9GSUxFJ10pIHtcbiAgICAgIGxvZ192ZXJib3NlKGBXb3JrYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL2JhemVsL2lzc3Vlcy83OTk0XG4gICAgICAgICAgICAgICAgIFJVTkZJTEVTX01BTklGRVNUX0ZJTEUgc2hvdWxkIGhhdmUgYmVlbiBzZXQgYnV0IHdhc24ndC5cbiAgICAgICAgICAgICAgICAgZmFsbGluZyBiYWNrIHRvIHVzaW5nIHJ1bmZpbGVzIHN5bWxpbmtzLlxuICAgICAgICAgICAgICAgICBJZiB5b3Ugd2FudCB0byB0ZXN0IHJ1bmZpbGVzIG1hbmlmZXN0IGJlaGF2aW9yLCBhZGRcbiAgICAgICAgICAgICAgICAgLS1zcGF3bl9zdHJhdGVneT1zdGFuZGFsb25lIHRvIHRoZSBjb21tYW5kIGxpbmUuYCk7XG4gICAgfVxuXG4gICAgY29uc3Qgd2tzcCA9IGVudlsnVEVTVF9XT1JLU1BBQ0UnXTtcbiAgICBjb25zdCB0YXJnZXQgPSBlbnZbJ1RFU1RfVEFSR0VUJ107XG4gICAgaWYgKCEhd2tzcCAmJiAhIXRhcmdldCkge1xuICAgICAgLy8gLy9wYXRoL3RvOnRhcmdldCAtPiAvL3BhdGgvdG9cbiAgICAgIGNvbnN0IHBrZyA9IHRhcmdldC5zcGxpdCgnOicpWzBdO1xuICAgICAgdGhpcy5wYWNrYWdlUGF0aCA9IHBhdGgucG9zaXguam9pbih3a3NwLCBwa2cpO1xuICAgIH1cbiAgfVxuXG4gIGxvb2t1cERpcmVjdG9yeShkaXI6IHN0cmluZyk6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5tYW5pZmVzdCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHRoaXMubWFuaWZlc3QpIHtcbiAgICAgIC8vIEFjY291bnQgZm9yIEJhemVsIC0tbGVnYWN5X2V4dGVybmFsX3J1bmZpbGVzXG4gICAgICAvLyB3aGljaCBwb2xsdXRlcyB0aGUgd29ya3NwYWNlIHdpdGggJ215X3drc3AvZXh0ZXJuYWwvLi4uJ1xuICAgICAgaWYgKGsuc3RhcnRzV2l0aChgJHtkaXJ9L2V4dGVybmFsYCkpIGNvbnRpbnVlO1xuXG4gICAgICAvLyBFbnRyeSBsb29rcyBsaWtlXG4gICAgICAvLyBrOiBucG0vbm9kZV9tb2R1bGVzL3NlbXZlci9MSUNFTlNFXG4gICAgICAvLyB2OiAvcGF0aC90by9leHRlcm5hbC9ucG0vbm9kZV9tb2R1bGVzL3NlbXZlci9MSUNFTlNFXG4gICAgICAvLyBjYWxjdWxhdGUgbCA9IGxlbmd0aChgL3NlbXZlci9MSUNFTlNFYClcbiAgICAgIGlmIChrLnN0YXJ0c1dpdGgoZGlyKSkge1xuICAgICAgICBjb25zdCBsID0gay5sZW5ndGggLSBkaXIubGVuZ3RoO1xuICAgICAgICByZXR1cm4gdi5zdWJzdHJpbmcoMCwgdi5sZW5ndGggLSBsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIC8qKlxuICAgKiBUaGUgcnVuZmlsZXMgbWFuaWZlc3QgbWFwcyBmcm9tIHNob3J0X3BhdGhcbiAgICogaHR0cHM6Ly9kb2NzLmJhemVsLmJ1aWxkL3ZlcnNpb25zL21hc3Rlci9za3lsYXJrL2xpYi9GaWxlLmh0bWwjc2hvcnRfcGF0aFxuICAgKiB0byB0aGUgYWN0dWFsIGxvY2F0aW9uIG9uIGRpc2sgd2hlcmUgdGhlIGZpbGUgY2FuIGJlIHJlYWQuXG4gICAqXG4gICAqIEluIGEgc2FuZGJveGVkIGV4ZWN1dGlvbiwgaXQgZG9lcyBub3QgZXhpc3QuIEluIHRoYXQgY2FzZSwgcnVuZmlsZXMgbXVzdCBiZVxuICAgKiByZXNvbHZlZCBmcm9tIGEgc3ltbGluayB0cmVlIHVuZGVyIHRoZSBydW5maWxlcyBkaXIuXG4gICAqIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9iYXplbC9pc3N1ZXMvMzcyNlxuICAgKi9cbiAgbG9hZFJ1bmZpbGVzTWFuaWZlc3QobWFuaWZlc3RQYXRoOiBzdHJpbmcpIHtcbiAgICBsb2dfdmVyYm9zZShgdXNpbmcgcnVuZmlsZXMgbWFuaWZlc3QgJHttYW5pZmVzdFBhdGh9YCk7XG5cbiAgICBjb25zdCBydW5maWxlc0VudHJpZXMgPSBuZXcgTWFwKCk7XG4gICAgY29uc3QgaW5wdXQgPSBmcy5yZWFkRmlsZVN5bmMobWFuaWZlc3RQYXRoLCB7ZW5jb2Rpbmc6ICd1dGYtOCd9KTtcblxuICAgIGZvciAoY29uc3QgbGluZSBvZiBpbnB1dC5zcGxpdCgnXFxuJykpIHtcbiAgICAgIGlmICghbGluZSkgY29udGludWU7XG4gICAgICBjb25zdCBbcnVuZmlsZXNQYXRoLCByZWFsUGF0aF0gPSBsaW5lLnNwbGl0KCcgJyk7XG4gICAgICBydW5maWxlc0VudHJpZXMuc2V0KHJ1bmZpbGVzUGF0aCwgcmVhbFBhdGgpO1xuICAgIH1cblxuICAgIHJldHVybiBydW5maWxlc0VudHJpZXM7XG4gIH1cblxuICByZXNvbHZlKG1vZHVsZVBhdGg6IHN0cmluZykge1xuICAgIC8vIExvb2sgaW4gdGhlIHJ1bmZpbGVzIGZpcnN0XG4gICAgaWYgKHRoaXMubWFuaWZlc3QpIHtcbiAgICAgIHJldHVybiB0aGlzLmxvb2t1cERpcmVjdG9yeShtb2R1bGVQYXRoKTtcbiAgICB9XG4gICAgaWYgKHJ1bmZpbGVzLmRpcikge1xuICAgICAgcmV0dXJuIHBhdGguam9pbihydW5maWxlcy5kaXIsIG1vZHVsZVBhdGgpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYGNvdWxkIG5vdCByZXNvbHZlIG1vZHVsZVBhdGggJHttb2R1bGVQYXRofWApO1xuICB9XG5cbiAgcmVzb2x2ZVBhY2thZ2VSZWxhdGl2ZShtb2R1bGVQYXRoOiBzdHJpbmcpIHtcbiAgICBpZiAoIXRoaXMucGFja2FnZVBhdGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncGFja2FnZVBhdGggY291bGQgbm90IGJlIGRldGVybWluZWQgZnJvbSB0aGUgZW52aXJvbm1lbnQnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVzb2x2ZShwYXRoLnBvc2l4LmpvaW4odGhpcy5wYWNrYWdlUGF0aCwgbW9kdWxlUGF0aCkpO1xuICB9XG59XG5cbi8vIFR5cGVTY3JpcHQgbGliLmVzNS5kLnRzIGhhcyBhIG1pc3Rha2U6IEpTT04ucGFyc2UgZG9lcyBhY2NlcHQgQnVmZmVyLlxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgSlNPTiB7XG4gICAgcGFyc2UoYjoge3RvU3RyaW5nOiAoKSA9PiBzdHJpbmd9KTogYW55O1xuICB9XG59XG5cbi8vIFRoZXJlIGlzIG5vIGZzLnByb21pc2VzLmV4aXN0cyBmdW5jdGlvbiBiZWNhdXNlXG4vLyBub2RlIGNvcmUgaXMgb2YgdGhlIG9waW5pb24gdGhhdCBleGlzdHMgaXMgYWx3YXlzIHRvbyByYWNleSB0byByZWx5IG9uLlxuYXN5bmMgZnVuY3Rpb24gZXhpc3RzKHA6IHN0cmluZykge1xuICB0cnkge1xuICAgIGF3YWl0IGZzLnByb21pc2VzLnN0YXQocClcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH1cbn1cblxuLy8gU2VlIGxpbmtfbm9kZV9tb2R1bGVzLmJ6bCB3aGVyZSB0aGVzZSB0aHJlZSBzdHJpbmdzXG4vLyBhcmUgdXNlZCB0byBpbmRpY2F0ZSB3aGljaCByb290IHRoZSBsaW5rZXIgc2hvdWxkIHRhcmdldFxuLy8gZm9yIGVhY2ggcGFja2FnZTpcbi8vIGJpbjogYmF6ZWwtYmluL3BhdGgvdG8vcGFja2FnZVxuLy8gc3JjOiB3b3Jrc3BhY2UvcGF0aC90by9wYWNrYWdlXG4vLyBydW5maWxlczogbG9vayBpbiB0aGUgcnVuZmlsZXMgZGlyL21hbmlmZXN0XG50eXBlIExpbmtlclJvb3QgPSAnYmluJ3wnc3JjJ3wncnVuZmlsZXMnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihhcmdzOiBzdHJpbmdbXSwgcnVuZmlsZXM6IFJ1bmZpbGVzKSB7XG4gIGlmICghYXJncyB8fCBhcmdzLmxlbmd0aCA8IDEpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdsaW5rX25vZGVfbW9kdWxlcy5qcyByZXF1aXJlcyBvbmUgYXJndW1lbnQ6IG1vZHVsZXNNYW5pZmVzdCBwYXRoJyk7XG5cbiAgY29uc3QgW21vZHVsZXNNYW5pZmVzdF0gPSBhcmdzO1xuICBsZXQge2Jpbiwgcm9vdCwgbW9kdWxlcywgd29ya3NwYWNlfSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1vZHVsZXNNYW5pZmVzdCkpO1xuICBtb2R1bGVzID0gbW9kdWxlcyB8fCB7fTtcbiAgbG9nX3ZlcmJvc2UoXG4gICAgICBgbW9kdWxlIG1hbmlmZXN0OiB3b3Jrc3BhY2UgJHt3b3Jrc3BhY2V9LCBiaW4gJHtiaW59LCByb290ICR7XG4gICAgICAgICAgcm9vdH0gd2l0aCBmaXJzdC1wYXJ0eSBwYWNrYWdlc1xcbmAsXG4gICAgICBtb2R1bGVzKTtcblxuICBjb25zdCByb290RGlyID0gcmVzb2x2ZVJvb3Qocm9vdCwgcnVuZmlsZXMpO1xuICBsb2dfdmVyYm9zZSgncmVzb2x2ZWQgcm9vdCcsIHJvb3QsICd0bycsIHJvb3REaXIpO1xuXG4gIC8vIEJhemVsIHN0YXJ0cyBhY3Rpb25zIHdpdGggcHdkPWV4ZWNyb290L215X3drc3BcbiAgY29uc3Qgd29ya3NwYWNlRGlyID0gcGF0aC5yZXNvbHZlKCcuJyk7XG5cbiAgLy8gQ29udmVydCBmcm9tIHJ1bmZpbGVzIHBhdGhcbiAgLy8gdGhpc193a3NwL3BhdGgvdG8vZmlsZSBPUiBvdGhlcl93a3NwL3BhdGgvdG8vZmlsZVxuICAvLyB0byBleGVjcm9vdCBwYXRoXG4gIC8vIHBhdGgvdG8vZmlsZSBPUiBleHRlcm5hbC9vdGhlcl93a3NwL3BhdGgvdG8vZmlsZVxuICBmdW5jdGlvbiB0b1dvcmtzcGFjZURpcihwOiBzdHJpbmcpIHtcbiAgICBpZiAocCA9PT0gd29ya3NwYWNlKSB7XG4gICAgICByZXR1cm4gJy4nO1xuICAgIH1cbiAgICAvLyBUaGUgbWFuaWZlc3QgaXMgd3JpdHRlbiB3aXRoIGZvcndhcmQgc2xhc2ggb24gYWxsIHBsYXRmb3Jtc1xuICAgIGlmIChwLnN0YXJ0c1dpdGgod29ya3NwYWNlICsgJy8nKSkge1xuICAgICAgcmV0dXJuIHAuc3Vic3RyaW5nKHdvcmtzcGFjZS5sZW5ndGggKyAxKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGguam9pbignZXh0ZXJuYWwnLCBwKTtcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgJHB3ZC9ub2RlX21vZHVsZXMgZGlyZWN0b3J5IHRoYXQgbm9kZSB3aWxsIHJlc29sdmUgZnJvbVxuICBhd2FpdCBzeW1saW5rKHJvb3REaXIsICdub2RlX21vZHVsZXMnKTtcbiAgcHJvY2Vzcy5jaGRpcihyb290RGlyKTtcblxuICAvLyBTeW1saW5rcyB0byBwYWNrYWdlcyBuZWVkIHRvIHJlYWNoIGJhY2sgdG8gdGhlIHdvcmtzcGFjZS9ydW5maWxlcyBkaXJlY3RvcnlcbiAgY29uc3Qgd29ya3NwYWNlQWJzID0gcGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpcik7XG5cbiAgLy8gTm93IGFkZCBzeW1saW5rcyB0byBlYWNoIG9mIG91ciBmaXJzdC1wYXJ0eSBwYWNrYWdlcyBzbyB0aGV5IGFwcGVhciB1bmRlciB0aGUgbm9kZV9tb2R1bGVzIHRyZWVcbiAgY29uc3QgbGlua3MgPSBbXTtcblxuICBjb25zdCBsaW5rTW9kdWxlID1cbiAgICAgIGFzeW5jIChuYW1lOiBzdHJpbmcsIHJvb3Q6IExpbmtlclJvb3QsIG1vZHVsZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIGxldCB0YXJnZXQ6IHN0cmluZyA9ICc8cGFja2FnZSBsaW5raW5nIGZhaWxlZD4nO1xuICAgIHN3aXRjaCAocm9vdCkge1xuICAgICAgY2FzZSAnYmluJzpcbiAgICAgICAgLy8gRklYTUUoIzExOTYpXG4gICAgICAgIHRhcmdldCA9IHBhdGguam9pbih3b3Jrc3BhY2VBYnMsIGJpbiwgdG9Xb3Jrc3BhY2VEaXIobW9kdWxlUGF0aCkpO1xuICAgICAgICAvLyBTcGVuZCBhbiBleHRyYSBGUyBsb29rdXAgdG8gZ2l2ZSBiZXR0ZXIgZXJyb3IgaW4gdGhpcyBjYXNlXG4gICAgICAgIGlmICghYXdhaXQgZXhpc3RzKHRhcmdldCkpIHtcbiAgICAgICAgICAvLyBUT0RPOiB0aGVyZSBzaG91bGQgYmUgc29tZSBkb2NzIGV4cGxhaW5pbmcgaG93IHVzZXJzIGFyZVxuICAgICAgICAgIC8vIGV4cGVjdGVkIHRvIGRlY2xhcmUgYWhlYWQgb2YgdGltZSB3aGVyZSB0aGUgcGFja2FnZSBpcyBsb2FkZWQsXG4gICAgICAgICAgLy8gaG93IHRoYXQgcmVsYXRlcyB0byBucG0gbGluayBzY2VuYXJpb3MsXG4gICAgICAgICAgLy8gYW5kIHdoZXJlIHRoZSBjb25maWd1cmF0aW9uIGNhbiBnby5cbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoYEVSUk9SOiBubyBvdXRwdXQgZGlyZWN0b3J5IGZvdW5kIGZvciBwYWNrYWdlICR7bW9kdWxlUGF0aH1cbiAgICAgICAgRGlkIHlvdSBtZWFuIHRvIGRlY2xhcmUgdGhpcyBhcyBhIGZyb20tc291cmNlIHBhY2thZ2U/XG4gICAgICAgIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9ydWxlc19ub2RlanMvcHVsbC8xMTk3XG4gICAgICAgIHVudGlsIHRoaXMgZmVhdHVyZSBpcyBwcm9wZXJseSBkb2N1bWVudGVkLmApO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3JjJzpcbiAgICAgICAgdGFyZ2V0ID0gcGF0aC5qb2luKHdvcmtzcGFjZUFicywgdG9Xb3Jrc3BhY2VEaXIobW9kdWxlUGF0aCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3J1bmZpbGVzJzpcbiAgICAgICAgdGFyZ2V0ID0gcnVuZmlsZXMucmVzb2x2ZShtb2R1bGVQYXRoKSB8fCAnPHJ1bmZpbGVzIHJlc29sdXRpb24gZmFpbGVkPic7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGF3YWl0IHN5bWxpbmsodGFyZ2V0LCBuYW1lKTtcbiAgfVxuXG4gIGZvciAoY29uc3QgbSBvZiBPYmplY3Qua2V5cyhtb2R1bGVzKSkge1xuICAgIGNvbnN0IHNlZ21lbnRzID0gbS5zcGxpdCgnLycpO1xuICAgIGlmIChzZWdtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG1vZHVsZSAke219IGhhcyBtb3JlIHRoYW4gMiBzZWdtZW50cyB3aGljaCBpcyBub3QgYSB2YWxpZCBub2RlIG1vZHVsZSBuYW1lYCk7XG4gICAgfVxuICAgIGlmIChzZWdtZW50cy5sZW5ndGggPT0gMikge1xuICAgICAgLy8gZW5zdXJlIHRoZSBzY29wZSBleGlzdHNcbiAgICAgIG1rZGlycChzZWdtZW50c1swXSk7XG4gICAgfVxuICAgIGNvbnN0IFtraW5kLCBtb2R1bGVQYXRoXSA9IG1vZHVsZXNbbV07XG4gICAgbGlua3MucHVzaChsaW5rTW9kdWxlKG0sIGtpbmQsIG1vZHVsZVBhdGgpKTtcbiAgfVxuXG4gIGxldCBjb2RlID0gMDtcbiAgYXdhaXQgUHJvbWlzZS5hbGwobGlua3MpLmNhdGNoKGUgPT4ge1xuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgY29kZSA9IDE7XG4gIH0pO1xuXG4gIHJldHVybiBjb2RlO1xufVxuXG5leHBvcnQgY29uc3QgcnVuZmlsZXMgPSBuZXcgUnVuZmlsZXMocHJvY2Vzcy5lbnYpO1xuXG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgKGFzeW5jICgpID0+IHtcbiAgICBwcm9jZXNzLmV4aXRDb2RlID0gYXdhaXQgbWFpbihwcm9jZXNzLmFyZ3Yuc2xpY2UoMiksIHJ1bmZpbGVzKTtcbiAgfSkoKTtcbn1cbiJdfQ==
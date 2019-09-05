/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */(function (factory) {
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
        if (fs.existsSync(path)) {
            // We assume here that the path is already linked to the correct target.
            // Could add some logic that asserts it here, but we want to avoid an extra
            // filesystem access so we should only do it under some kind of strict mode.
            return;
        }
        log_verbose(`symlink( ${path} -> ${target} )`);
        // Use junction on Windows since symlinks require elevated permissions.
        // We only link to directories so junctions work for us.
        fs.symlinkSync(target, path, 'junction');
        if (VERBOSE_LOGS) {
            // Be verbose about creating a bad symlink
            // Maybe this should fail in production as well, but again we want to avoid
            // any unneeded file I/O
            if (!fs.existsSync(path)) {
                log_verbose('ERROR\n***\nLooks like we created a bad symlink:' +
                    `\n  pwd ${process.cwd()}\n  target ${target}\n***`);
            }
        }
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
    function main(args, runfiles) {
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
        symlink(rootDir, 'node_modules');
        process.chdir(rootDir);
        // Symlinks to packages need to reach back to the workspace/runfiles directory
        const workspaceRelative = path.relative('.', workspaceDir);
        const runfilesRelative = runfiles.dir ? path.relative('.', runfiles.dir) : undefined;
        // Now add symlinks to each of our first-party packages so they appear under the node_modules tree
        for (const m of Object.keys(modules)) {
            let target;
            // Look in the runfiles first
            // TODO: this could be a method in the Runfiles class
            if (runfiles.manifest) {
                target = runfiles.lookupDirectory(modules[m]);
            }
            else if (runfilesRelative) {
                target = path.join(runfilesRelative, modules[m]);
            }
            // It sucks that we have to do a FS call here.
            // TODO: could we know which packages are statically linked??
            if (!target || !fs.existsSync(target)) {
                // Try the execroot
                target = path.join(workspaceRelative, toWorkspaceDir(modules[m]));
            }
            symlink(target, m);
        }
        return 0;
    }
    exports.main = main;
    if (require.main === module) {
        process.exitCode = main(process.argv.slice(2), new Runfiles());
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua19ub2RlX21vZHVsZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC9saW5rZXIvbGlua19ub2RlX21vZHVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7OztPQUlHO0lBQ0gseUJBQXlCO0lBQ3pCLDZCQUE2QjtJQUU3QixnRUFBZ0U7SUFDaEUsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7SUFFbkQsU0FBUyxXQUFXLENBQUMsR0FBRyxDQUFXO1FBQ2pDLElBQUksWUFBWTtZQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRUQsU0FBUyxLQUFLLENBQUMsQ0FBUztRQUN0QixNQUFNLElBQUksS0FBSyxDQUFDOzs7Ozs7SUFNZCxDQUFDO0dBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFNBQVMsT0FBTyxDQUFDLE1BQWMsRUFBRSxJQUFZO1FBQzNDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN2Qix3RUFBd0U7WUFDeEUsMkVBQTJFO1lBQzNFLDRFQUE0RTtZQUM1RSxPQUFPO1NBQ1I7UUFDRCxXQUFXLENBQUMsWUFBWSxJQUFJLE9BQU8sTUFBTSxJQUFJLENBQUMsQ0FBQztRQUMvQyx1RUFBdUU7UUFDdkUsd0RBQXdEO1FBQ3hELEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUN6QyxJQUFJLFlBQVksRUFBRTtZQUNoQiwwQ0FBMEM7WUFDMUMsMkVBQTJFO1lBQzNFLHdCQUF3QjtZQUN4QixJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDeEIsV0FBVyxDQUNQLGtEQUFrRDtvQkFDbEQsV0FB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LE1BQXdCLENBQUM7WUFFN0IsNkJBQTZCO1lBQzdCLHFEQUFxRDtZQUNyRCxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3JCLE1BQU0sR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQy9DO2lCQUFNLElBQUksZ0JBQWdCLEVBQUU7Z0JBQzNCLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2xEO1lBRUQsOENBQThDO1lBQzlDLDZEQUE2RDtZQUM3RCxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDckMsbUJBQW1CO2dCQUNuQixNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNuRTtZQUNELE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDcEI7UUFFRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUF6REQsb0JBeURDO0lBRUQsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtRQUMzQixPQUFPLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsRUFBRSxDQUFDLENBQUM7S0FDaEUiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgQ3JlYXRlcyBhIG5vZGVfbW9kdWxlcyBkaXJlY3RvcnkgaW4gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAqIGFuZCBzeW1saW5rcyBpbiB0aGUgbm9kZSBtb2R1bGVzIG5lZWRlZCB0byBydW4gYSBwcm9ncmFtLlxuICogVGhpcyByZXBsYWNlcyB0aGUgbmVlZCBmb3IgY3VzdG9tIG1vZHVsZSByZXNvbHV0aW9uIGxvZ2ljIGluc2lkZSB0aGUgcHJvY2Vzcy5cbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gUnVuIEJhemVsIHdpdGggLS1kZWZpbmU9VkVSQk9TRV9MT0dTPTEgdG8gZW5hYmxlIHRoaXMgbG9nZ2luZ1xuY29uc3QgVkVSQk9TRV9MT0dTID0gISFwcm9jZXNzLmVudlsnVkVSQk9TRV9MT0dTJ107XG5cbmZ1bmN0aW9uIGxvZ192ZXJib3NlKC4uLm06IHN0cmluZ1tdKSB7XG4gIGlmIChWRVJCT1NFX0xPR1MpIGNvbnNvbGUuZXJyb3IoJ1tsaW5rX25vZGVfbW9kdWxlcy5qc10nLCAuLi5tKTtcbn1cblxuZnVuY3Rpb24gcGFuaWMobTogc3RyaW5nKSB7XG4gIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgZXJyb3IhIFBsZWFzZSBydW4gYWdhaW4gd2l0aFxuICAgLS1kZWZpbmU9VkVSQk9TRV9MT0c9MVxuYW5kIGZpbGUgYW4gaXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9pc3N1ZXMvbmV3P3RlbXBsYXRlPWJ1Z19yZXBvcnQubWRcbkluY2x1ZGUgYXMgbXVjaCBvZiB0aGUgYnVpbGQgb3V0cHV0IGFzIHlvdSBjYW4gd2l0aG91dCBkaXNjbG9zaW5nIGFueXRoaW5nIGNvbmZpZGVudGlhbC5cblxuICBFcnJvcjpcbiAgJHttfVxuICBgKTtcbn1cblxuZnVuY3Rpb24gc3ltbGluayh0YXJnZXQ6IHN0cmluZywgcGF0aDogc3RyaW5nKSB7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBhdGgpKSB7XG4gICAgLy8gV2UgYXNzdW1lIGhlcmUgdGhhdCB0aGUgcGF0aCBpcyBhbHJlYWR5IGxpbmtlZCB0byB0aGUgY29ycmVjdCB0YXJnZXQuXG4gICAgLy8gQ291bGQgYWRkIHNvbWUgbG9naWMgdGhhdCBhc3NlcnRzIGl0IGhlcmUsIGJ1dCB3ZSB3YW50IHRvIGF2b2lkIGFuIGV4dHJhXG4gICAgLy8gZmlsZXN5c3RlbSBhY2Nlc3Mgc28gd2Ugc2hvdWxkIG9ubHkgZG8gaXQgdW5kZXIgc29tZSBraW5kIG9mIHN0cmljdCBtb2RlLlxuICAgIHJldHVybjtcbiAgfVxuICBsb2dfdmVyYm9zZShgc3ltbGluayggJHtwYXRofSAtPiAke3RhcmdldH0gKWApO1xuICAvLyBVc2UganVuY3Rpb24gb24gV2luZG93cyBzaW5jZSBzeW1saW5rcyByZXF1aXJlIGVsZXZhdGVkIHBlcm1pc3Npb25zLlxuICAvLyBXZSBvbmx5IGxpbmsgdG8gZGlyZWN0b3JpZXMgc28ganVuY3Rpb25zIHdvcmsgZm9yIHVzLlxuICBmcy5zeW1saW5rU3luYyh0YXJnZXQsIHBhdGgsICdqdW5jdGlvbicpO1xuICBpZiAoVkVSQk9TRV9MT0dTKSB7XG4gICAgLy8gQmUgdmVyYm9zZSBhYm91dCBjcmVhdGluZyBhIGJhZCBzeW1saW5rXG4gICAgLy8gTWF5YmUgdGhpcyBzaG91bGQgZmFpbCBpbiBwcm9kdWN0aW9uIGFzIHdlbGwsIGJ1dCBhZ2FpbiB3ZSB3YW50IHRvIGF2b2lkXG4gICAgLy8gYW55IHVubmVlZGVkIGZpbGUgSS9PXG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKHBhdGgpKSB7XG4gICAgICBsb2dfdmVyYm9zZShcbiAgICAgICAgICAnRVJST1JcXG4qKipcXG5Mb29rcyBsaWtlIHdlIGNyZWF0ZWQgYSBiYWQgc3ltbGluazonICtcbiAgICAgICAgICBgXFxuICBwd2QgJHtwcm9jZXNzLmN3ZCgpfVxcbiAgdGFyZ2V0ICR7dGFyZ2V0fVxcbioqKmApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJlc29sdmUgYSByb290IGRpcmVjdG9yeSBzdHJpbmcgdG8gdGhlIGFjdHVhbCBsb2NhdGlvbiBvbiBkaXNrXG4gKiB3aGVyZSBub2RlX21vZHVsZXMgd2FzIGluc3RhbGxlZFxuICogQHBhcmFtIHJvb3QgYSBzdHJpbmcgbGlrZSAnbnBtL25vZGVfbW9kdWxlcydcbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVJvb3Qocm9vdDogc3RyaW5nfHVuZGVmaW5lZCwgcnVuZmlsZXM6IFJ1bmZpbGVzKSB7XG4gIC8vIGNyZWF0ZSBhIG5vZGVfbW9kdWxlcyBkaXJlY3RvcnkgaWYgbm8gcm9vdFxuICAvLyB0aGlzIHdpbGwgYmUgdGhlIGNhc2UgaWYgb25seSBmaXJzdC1wYXJ0eSBtb2R1bGVzIGFyZSBpbnN0YWxsZWRcbiAgaWYgKCFyb290KSB7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgbG9nX3ZlcmJvc2UoJ25vIHRoaXJkLXBhcnR5IHBhY2thZ2VzOyBta2RpciBub2RlX21vZHVsZXMgaW4gJywgcHJvY2Vzcy5jd2QoKSk7XG4gICAgICBmcy5ta2RpclN5bmMoJ25vZGVfbW9kdWxlcycpO1xuICAgIH1cbiAgICByZXR1cm4gJ25vZGVfbW9kdWxlcyc7XG4gIH1cblxuICAvLyBJZiB3ZSBnb3QgYSBydW5maWxlc01hbmlmZXN0IG1hcCwgbG9vayB0aHJvdWdoIGl0IGZvciBhIHJlc29sdXRpb25cbiAgLy8gVGhpcyB3aWxsIGhhcHBlbiBpZiB3ZSBhcmUgcnVubmluZyBhIGJpbmFyeSB0aGF0IGhhZCBzb21lIG5wbSBwYWNrYWdlc1xuICAvLyBcInN0YXRpY2FsbHkgbGlua2VkXCIgaW50byBpdHMgcnVuZmlsZXNcbiAgY29uc3QgZnJvbU1hbmlmZXN0ID0gcnVuZmlsZXMubG9va3VwRGlyZWN0b3J5KHJvb3QpO1xuICBpZiAoZnJvbU1hbmlmZXN0KSByZXR1cm4gZnJvbU1hbmlmZXN0O1xuXG4gIC8vIEFjY291bnQgZm9yIEJhemVsIC0tbGVnYWN5X2V4dGVybmFsX3J1bmZpbGVzXG4gIC8vIHdoaWNoIGxvb2sgbGlrZSAnbXlfd2tzcC9leHRlcm5hbC9ucG0vbm9kZV9tb2R1bGVzJ1xuICBpZiAoZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCkpKSB7XG4gICAgbG9nX3ZlcmJvc2UoJ0ZvdW5kIGxlZ2FjeV9leHRlcm5hbF9ydW5maWxlcywgc3dpdGNoaW5nIHJvb3QgdG8nLCBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCkpO1xuICAgIHJldHVybiBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcm9vdCk7XG4gIH1cblxuICAvLyBUaGUgcmVwb3NpdG9yeSBzaG91bGQgYmUgbGF5ZWQgb3V0IGluIHRoZSBwYXJlbnQgZGlyZWN0b3J5XG4gIC8vIHNpbmNlIGJhemVsIHNldHMgb3VyIHdvcmtpbmcgZGlyZWN0b3J5IHRvIHRoZSByZXBvc2l0b3J5IHdoZXJlIHRoZSBidWlsZCBpcyBoYXBwZW5pbmdcbiAgcmV0dXJuIHBhdGguam9pbignLi4nLCByb290KTtcbn1cblxuZXhwb3J0IGNsYXNzIFJ1bmZpbGVzIHtcbiAgbWFuaWZlc3Q6IE1hcDxzdHJpbmcsIHN0cmluZz58dW5kZWZpbmVkO1xuICBkaXI6IHN0cmluZ3x1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgLy8gSWYgQmF6ZWwgc2V0cyBhIHZhcmlhYmxlIHBvaW50aW5nIHRvIGEgcnVuZmlsZXMgbWFuaWZlc3QsXG4gICAgLy8gd2UnbGwgYWx3YXlzIHVzZSBpdC5cbiAgICAvLyBOb3RlIHRoYXQgdGhpcyBoYXMgYSBzbGlnaHQgcGVyZm9ybWFuY2UgaW1wbGljYXRpb24gb24gTWFjL0xpbnV4XG4gICAgLy8gd2hlcmUgd2UgY291bGQgdXNlIHRoZSBydW5maWxlcyB0cmVlIGFscmVhZHkgbGFpZCBvdXQgb24gZGlza1xuICAgIC8vIGJ1dCB0aGlzIGp1c3QgY29zdHMgb25lIGZpbGUgcmVhZCBmb3IgdGhlIGV4dGVybmFsIG5wbS9ub2RlX21vZHVsZXNcbiAgICAvLyBhbmQgb25lIGZvciBlYWNoIGZpcnN0LXBhcnR5IG1vZHVsZSwgbm90IG9uZSBwZXIgZmlsZS5cbiAgICBpZiAoISFwcm9jZXNzLmVudlsnUlVORklMRVNfTUFOSUZFU1RfRklMRSddKSB7XG4gICAgICB0aGlzLm1hbmlmZXN0ID0gdGhpcy5sb2FkUnVuZmlsZXNNYW5pZmVzdChwcm9jZXNzLmVudlsnUlVORklMRVNfTUFOSUZFU1RfRklMRSddISk7XG4gICAgfSBlbHNlIGlmICghIXByb2Nlc3MuZW52WydSVU5GSUxFU19ESVInXSkge1xuICAgICAgdGhpcy5kaXIgPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5lbnZbJ1JVTkZJTEVTX0RJUiddISk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhbmljKFxuICAgICAgICAgICdFdmVyeSBub2RlIHByb2dyYW0gcnVuIHVuZGVyIEJhemVsIG11c3QgaGF2ZSBhICRSVU5GSUxFU19ESVIgb3IgJFJVTkZJTEVTX01BTklGRVNUX0ZJTEUgZW52aXJvbm1lbnQgdmFyaWFibGUnKTtcbiAgICB9XG4gICAgLy8gVW5kZXIgLS1ub2VuYWJsZV9ydW5maWxlcyAoaW4gcGFydGljdWxhciBvbiBXaW5kb3dzKVxuICAgIC8vIEJhemVsIHNldHMgUlVORklMRVNfTUFOSUZFU1RfT05MWT0xLlxuICAgIC8vIFdoZW4gdGhpcyBoYXBwZW5zLCB3ZSBuZWVkIHRvIHJlYWQgdGhlIG1hbmlmZXN0IGZpbGUgdG8gbG9jYXRlXG4gICAgLy8gaW5wdXRzXG4gICAgaWYgKHByb2Nlc3MuZW52WydSVU5GSUxFU19NQU5JRkVTVF9PTkxZJ10gPT09ICcxJyAmJiAhcHJvY2Vzcy5lbnZbJ1JVTkZJTEVTX01BTklGRVNUX0ZJTEUnXSkge1xuICAgICAgbG9nX3ZlcmJvc2UoYFdvcmthcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvYmF6ZWwvaXNzdWVzLzc5OTRcbiAgICAgICAgICAgICAgICAgUlVORklMRVNfTUFOSUZFU1RfRklMRSBzaG91bGQgaGF2ZSBiZWVuIHNldCBidXQgd2Fzbid0LlxuICAgICAgICAgICAgICAgICBmYWxsaW5nIGJhY2sgdG8gdXNpbmcgcnVuZmlsZXMgc3ltbGlua3MuXG4gICAgICAgICAgICAgICAgIElmIHlvdSB3YW50IHRvIHRlc3QgcnVuZmlsZXMgbWFuaWZlc3QgYmVoYXZpb3IsIGFkZFxuICAgICAgICAgICAgICAgICAtLXNwYXduX3N0cmF0ZWd5PXN0YW5kYWxvbmUgdG8gdGhlIGNvbW1hbmQgbGluZS5gKTtcbiAgICB9XG4gIH1cblxuICBsb29rdXBEaXJlY3RvcnkoZGlyOiBzdHJpbmcpOiBzdHJpbmd8dW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMubWFuaWZlc3QpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiB0aGlzLm1hbmlmZXN0KSB7XG4gICAgICAvLyBFbnRyeSBsb29rcyBsaWtlXG4gICAgICAvLyBrOiBucG0vbm9kZV9tb2R1bGVzL3NlbXZlci9MSUNFTlNFXG4gICAgICAvLyB2OiAvcGF0aC90by9leHRlcm5hbC9ucG0vbm9kZV9tb2R1bGVzL3NlbXZlci9MSUNFTlNFXG4gICAgICAvLyBjYWxjdWxhdGUgbCA9IGxlbmd0aChgL3NlbXZlci9MSUNFTlNFYClcbiAgICAgIGlmIChrLnN0YXJ0c1dpdGgoZGlyKSkge1xuICAgICAgICBjb25zdCBsID0gay5sZW5ndGggLSBkaXIubGVuZ3RoO1xuICAgICAgICByZXR1cm4gdi5zdWJzdHJpbmcoMCwgdi5sZW5ndGggLSBsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIC8qKlxuICAgKiBUaGUgcnVuZmlsZXMgbWFuaWZlc3QgbWFwcyBmcm9tIHNob3J0X3BhdGhcbiAgICogaHR0cHM6Ly9kb2NzLmJhemVsLmJ1aWxkL3ZlcnNpb25zL21hc3Rlci9za3lsYXJrL2xpYi9GaWxlLmh0bWwjc2hvcnRfcGF0aFxuICAgKiB0byB0aGUgYWN0dWFsIGxvY2F0aW9uIG9uIGRpc2sgd2hlcmUgdGhlIGZpbGUgY2FuIGJlIHJlYWQuXG4gICAqXG4gICAqIEluIGEgc2FuZGJveGVkIGV4ZWN1dGlvbiwgaXQgZG9lcyBub3QgZXhpc3QuIEluIHRoYXQgY2FzZSwgcnVuZmlsZXMgbXVzdCBiZVxuICAgKiByZXNvbHZlZCBmcm9tIGEgc3ltbGluayB0cmVlIHVuZGVyIHRoZSBydW5maWxlcyBkaXIuXG4gICAqIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9iYXplbC9pc3N1ZXMvMzcyNlxuICAgKi9cbiAgbG9hZFJ1bmZpbGVzTWFuaWZlc3QobWFuaWZlc3RQYXRoOiBzdHJpbmcpIHtcbiAgICBsb2dfdmVyYm9zZShgdXNpbmcgcnVuZmlsZXMgbWFuaWZlc3QgJHttYW5pZmVzdFBhdGh9YCk7XG5cbiAgICBjb25zdCBydW5maWxlc0VudHJpZXMgPSBuZXcgTWFwKCk7XG4gICAgY29uc3QgaW5wdXQgPSBmcy5yZWFkRmlsZVN5bmMobWFuaWZlc3RQYXRoLCB7ZW5jb2Rpbmc6ICd1dGYtOCd9KTtcblxuICAgIGZvciAoY29uc3QgbGluZSBvZiBpbnB1dC5zcGxpdCgnXFxuJykpIHtcbiAgICAgIGlmICghbGluZSkgY29udGludWU7XG4gICAgICBjb25zdCBbcnVuZmlsZXNQYXRoLCByZWFsUGF0aF0gPSBsaW5lLnNwbGl0KCcgJyk7XG4gICAgICBydW5maWxlc0VudHJpZXMuc2V0KHJ1bmZpbGVzUGF0aCwgcmVhbFBhdGgpO1xuICAgIH1cblxuICAgIHJldHVybiBydW5maWxlc0VudHJpZXM7XG4gIH1cbn1cblxuLy8gVHlwZVNjcmlwdCBsaWIuZXM1LmQudHMgaGFzIGEgbWlzdGFrZTogSlNPTi5wYXJzZSBkb2VzIGFjY2VwdCBCdWZmZXIuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBKU09OIHtcbiAgICBwYXJzZShiOiBCdWZmZXIpOiBhbnk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1haW4oYXJnczogc3RyaW5nW10sIHJ1bmZpbGVzOiBSdW5maWxlcykge1xuICBpZiAoIWFyZ3MgfHwgYXJncy5sZW5ndGggPCAxKVxuICAgIHRocm93IG5ldyBFcnJvcignbGlua19ub2RlX21vZHVsZXMuanMgcmVxdWlyZXMgb25lIGFyZ3VtZW50OiBtb2R1bGVzTWFuaWZlc3QgcGF0aCcpO1xuXG4gIGNvbnN0IFttb2R1bGVzTWFuaWZlc3RdID0gYXJncztcbiAgbGV0IHtyb290LCBtb2R1bGVzLCB3b3Jrc3BhY2V9ID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMobW9kdWxlc01hbmlmZXN0KSk7XG4gIG1vZHVsZXMgPSBtb2R1bGVzIHx8IHt9O1xuICBsb2dfdmVyYm9zZShcbiAgICAgIGBtb2R1bGUgbWFuaWZlc3Q6IHdvcmtzcGFjZSAke3dvcmtzcGFjZX0sIHJvb3QgJHtyb290fSB3aXRoIGZpcnN0LXBhcnR5IHBhY2thZ2VzXFxuYCwgbW9kdWxlcyk7XG5cbiAgY29uc3Qgcm9vdERpciA9IHJlc29sdmVSb290KHJvb3QsIHJ1bmZpbGVzKTtcbiAgbG9nX3ZlcmJvc2UoJ3Jlc29sdmVkIHJvb3QnLCByb290LCAndG8nLCByb290RGlyKTtcblxuICAvLyBCYXplbCBzdGFydHMgYWN0aW9ucyB3aXRoIHB3ZD1leGVjcm9vdC9teV93a3NwXG4gIGNvbnN0IHdvcmtzcGFjZURpciA9IHBhdGgucmVzb2x2ZSgnLicpO1xuXG4gIC8vIENvbnZlcnQgZnJvbSBydW5maWxlcyBwYXRoXG4gIC8vIHRoaXNfd2tzcC9wYXRoL3RvL2ZpbGUgT1Igb3RoZXJfd2tzcC9wYXRoL3RvL2ZpbGVcbiAgLy8gdG8gZXhlY3Jvb3QgcGF0aFxuICAvLyBwYXRoL3RvL2ZpbGUgT1IgZXh0ZXJuYWwvb3RoZXJfd2tzcC9wYXRoL3RvL2ZpbGVcbiAgZnVuY3Rpb24gdG9Xb3Jrc3BhY2VEaXIocDogc3RyaW5nKSB7XG4gICAgaWYgKHAuc3RhcnRzV2l0aCh3b3Jrc3BhY2UgKyBwYXRoLnNlcCkpIHtcbiAgICAgIHJldHVybiBwLnN1YnN0cmluZyh3b3Jrc3BhY2UubGVuZ3RoICsgMSk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcCk7XG4gIH1cblxuICAvLyBDcmVhdGUgdGhlICRwd2Qvbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSB0aGF0IG5vZGUgd2lsbCByZXNvbHZlIGZyb21cbiAgc3ltbGluayhyb290RGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gIHByb2Nlc3MuY2hkaXIocm9vdERpcik7XG5cbiAgLy8gU3ltbGlua3MgdG8gcGFja2FnZXMgbmVlZCB0byByZWFjaCBiYWNrIHRvIHRoZSB3b3Jrc3BhY2UvcnVuZmlsZXMgZGlyZWN0b3J5XG4gIGNvbnN0IHdvcmtzcGFjZVJlbGF0aXZlID0gcGF0aC5yZWxhdGl2ZSgnLicsIHdvcmtzcGFjZURpcik7XG4gIGNvbnN0IHJ1bmZpbGVzUmVsYXRpdmUgPSBydW5maWxlcy5kaXIgPyBwYXRoLnJlbGF0aXZlKCcuJywgcnVuZmlsZXMuZGlyKSA6IHVuZGVmaW5lZDtcblxuICAvLyBOb3cgYWRkIHN5bWxpbmtzIHRvIGVhY2ggb2Ygb3VyIGZpcnN0LXBhcnR5IHBhY2thZ2VzIHNvIHRoZXkgYXBwZWFyIHVuZGVyIHRoZSBub2RlX21vZHVsZXMgdHJlZVxuICBmb3IgKGNvbnN0IG0gb2YgT2JqZWN0LmtleXMobW9kdWxlcykpIHtcbiAgICBsZXQgdGFyZ2V0OiBzdHJpbmd8dW5kZWZpbmVkO1xuXG4gICAgLy8gTG9vayBpbiB0aGUgcnVuZmlsZXMgZmlyc3RcbiAgICAvLyBUT0RPOiB0aGlzIGNvdWxkIGJlIGEgbWV0aG9kIGluIHRoZSBSdW5maWxlcyBjbGFzc1xuICAgIGlmIChydW5maWxlcy5tYW5pZmVzdCkge1xuICAgICAgdGFyZ2V0ID0gcnVuZmlsZXMubG9va3VwRGlyZWN0b3J5KG1vZHVsZXNbbV0pO1xuICAgIH0gZWxzZSBpZiAocnVuZmlsZXNSZWxhdGl2ZSkge1xuICAgICAgdGFyZ2V0ID0gcGF0aC5qb2luKHJ1bmZpbGVzUmVsYXRpdmUsIG1vZHVsZXNbbV0pO1xuICAgIH1cblxuICAgIC8vIEl0IHN1Y2tzIHRoYXQgd2UgaGF2ZSB0byBkbyBhIEZTIGNhbGwgaGVyZS5cbiAgICAvLyBUT0RPOiBjb3VsZCB3ZSBrbm93IHdoaWNoIHBhY2thZ2VzIGFyZSBzdGF0aWNhbGx5IGxpbmtlZD8/XG4gICAgaWYgKCF0YXJnZXQgfHwgIWZzLmV4aXN0c1N5bmModGFyZ2V0KSkge1xuICAgICAgLy8gVHJ5IHRoZSBleGVjcm9vdFxuICAgICAgdGFyZ2V0ID0gcGF0aC5qb2luKHdvcmtzcGFjZVJlbGF0aXZlLCB0b1dvcmtzcGFjZURpcihtb2R1bGVzW21dKSk7XG4gICAgfVxuICAgIHN5bWxpbmsodGFyZ2V0LCBtKTtcbiAgfVxuXG4gIHJldHVybiAwO1xufVxuXG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgcHJvY2Vzcy5leGl0Q29kZSA9IG1haW4ocHJvY2Vzcy5hcmd2LnNsaWNlKDIpLCBuZXcgUnVuZmlsZXMoKSk7XG59XG4iXX0=
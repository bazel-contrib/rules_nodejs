import * as path from 'path';
import * as fs from 'fs';
import {BAZEL_OUT_REGEX} from './paths';

/**
 * Class that provides methods for resolving Bazel runfiles.
 */
export class Runfiles {
  manifest: Map<string, string>|undefined;
  runfilesDir: string|undefined;
  /**
   * If the environment gives us enough hints, we can know the workspace name
   */
  workspace: string|undefined;
  /**
   * If the environment gives us enough hints, we can know the package path
   */
  package: string|undefined;

  constructor(private _env: typeof process.env) {
    // If Bazel sets a variable pointing to a runfiles manifest,
    // we'll always use it.
    // Note that this has a slight performance implication on Mac/Linux
    // where we could use the runfiles tree already laid out on disk
    // but this just costs one file read for the external npm/node_modules
    // and one for each first-party module, not one per file.
    if (!!_env['RUNFILES_MANIFEST_FILE']) {
      this.manifest = this.loadRunfilesManifest(_env['RUNFILES_MANIFEST_FILE']!);
    } else if (!!_env['RUNFILES_DIR']) {
      this.runfilesDir = path.resolve(_env['RUNFILES_DIR']!);
    } else {
      throw new Error(
        'Every node program run under Bazel must have a $RUNFILES_DIR or $RUNFILES_MANIFEST_FILE environment variable');
    }
    // Under --noenable_runfiles (in particular on Windows)
    // Bazel sets RUNFILES_MANIFEST_ONLY=1.
    // When this happens, we need to read the manifest file to locate
    // inputs
    if (_env['RUNFILES_MANIFEST_ONLY'] === '1' && !_env['RUNFILES_MANIFEST_FILE']) {
      console.warn(`Workaround https://github.com/bazelbuild/bazel/issues/7994
                 RUNFILES_MANIFEST_FILE should have been set but wasn't.
                 falling back to using runfiles symlinks.
                 If you want to test runfiles manifest behavior, add
                 --spawn_strategy=standalone to the command line.`);
    }
    // Bazel starts actions with pwd=execroot/my_wksp or pwd=runfiles/my_wksp
    this.workspace = _env['BAZEL_WORKSPACE'] || undefined;
    // If target is from an external workspace such as @npm//rollup/bin:rollup
    // resolvePackageRelative is not supported since package is in an external
    // workspace.
    const target = _env['BAZEL_TARGET'];
    if (!!target && !target.startsWith('@')) {
      // //path/to:target -> path/to
      this.package = target.split(':')[0].replace(/^\/\//, '');
    }
  }

  lookupDirectory(dir: string): string|undefined {
    if (!this.manifest) return undefined;

    let result: string|undefined;
    for (const [k, v] of this.manifest) {
      // Account for Bazel --legacy_external_runfiles
      // which pollutes the workspace with 'my_wksp/external/...'
      if (k.startsWith(`${dir}/external`)) continue;

      // Entry looks like
      // k: npm/node_modules/semver/LICENSE
      // v: /path/to/external/npm/node_modules/semver/LICENSE
      // calculate l = length(`/semver/LICENSE`)
      if (k.startsWith(dir)) {
        const l = k.length - dir.length;
        const maybe = v.substring(0, v.length - l);
        if (maybe.match(BAZEL_OUT_REGEX)) {
          return maybe;
        } else {
          result = maybe;
        }
      }
    }
    return result;
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
  loadRunfilesManifest(manifestPath: string) {
    const runfilesEntries = new Map();
    const input = fs.readFileSync(manifestPath, {encoding: 'utf-8'});

    for (const line of input.split('\n')) {
      if (!line) continue;
      const [runfilesPath, realPath] = line.split(' ');
      runfilesEntries.set(runfilesPath, realPath);
    }

    return runfilesEntries;
  }

  /** Resolves the given module path. */
  resolve(modulePath: string) {
    if (path.isAbsolute(modulePath)) {
      return modulePath;
    }
    const result = this._resolve(modulePath, undefined);
    if (result) {
      return result;
    }
    const e = new Error(`could not resolve module ${modulePath}`);
    (e as any).code = 'MODULE_NOT_FOUND';
    throw e;
  }

  /** Resolves the given path relative to the current Bazel workspace. */
  resolveWorkspaceRelative(modulePath: string) {
    if (!this.workspace) {
      throw new Error(
        'workspace could not be determined from the environment; make sure BAZEL_WORKSPACE is set');
    }
    return this.resolve(path.posix.join(this.workspace, modulePath));
  }

  /** Resolves the given path relative to the current Bazel package. */
  resolvePackageRelative(modulePath: string) {
    if (!this.workspace) {
      throw new Error(
        'workspace could not be determined from the environment; make sure BAZEL_WORKSPACE is set');
    }
    // NB: this.package may be '' if at the root of the workspace
    if (this.package === undefined) {
      throw new Error(
        'package could not be determined from the environment; make sure BAZEL_TARGET is set');
    }
    return this.resolve(path.posix.join(this.workspace, this.package, modulePath));
  }

  /**
   * Patches the default NodeJS resolution to support runfile resolution.
   * @deprecated Use the runfile helpers directly instead.
   **/
  patchRequire() {
    const requirePatch = this._env['BAZEL_NODE_PATCH_REQUIRE'];
    if (!requirePatch) {
      throw new Error('require patch location could not be determined from the environment');
    }
    require(requirePatch);
  }

  /** Helper for resolving a given module recursively in the runfiles. */
  private _resolve(moduleBase: string, moduleTail: string|undefined): string|undefined {
    if (this.manifest) {
      const result = this.lookupDirectory(moduleBase);
      if (result) {
        if (moduleTail) {
          const maybe = path.join(result, moduleTail || '');
          if (fs.existsSync(maybe)) {
            return maybe;
          }
        } else {
          return result;
        }
      }
    }
    if (this.runfilesDir) {
      const maybe = path.join(this.runfilesDir, moduleBase, moduleTail || '');
      if (fs.existsSync(maybe)) {
        return maybe;
      }
    }
    const dirname = path.dirname(moduleBase);
    if (dirname == '.') {
      // no match
      return undefined;
    }
    return this._resolve(dirname, path.join(path.basename(moduleBase), moduleTail || ''));
  }
}

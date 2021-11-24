/**
 * @license
 * Copyright 2019 The Bazel Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Stats} from 'fs';
import * as path from 'path';
import * as util from 'util';

// windows cant find the right types
type Dir = any;
type Dirent = any;

// using require here on purpose so we can override methods with any
// also even though imports are mutable in typescript the cognitive dissonance is too high because
// es modules
const _fs = require('fs');

// tslint:disable-next-line:no-any
export const patcher = (fs: any = _fs, roots: string[]) => {
  fs = fs || _fs;
  roots = roots || [];
  roots = roots.filter(root => fs.existsSync(root));
  if (!roots.length) {
    if (process.env.VERBOSE_LOGS) {
      console.error('fs patcher called without any valid root paths ' + __filename);
    }
    return;
  }

  const origRealpath = fs.realpath.bind(fs);
  const origRealpathNative = fs.realpath.native;
  const origLstat = fs.lstat.bind(fs);
  const origStat = fs.stat.bind(fs);
  const origStatSync = fs.statSync.bind(fs);
  const origReadlink = fs.readlink.bind(fs);
  const origLstatSync = fs.lstatSync.bind(fs);
  const origRealpathSync = fs.realpathSync.bind(fs);
  const origRealpathSyncNative = fs.realpathSync.native;
  const origReadlinkSync = fs.readlinkSync.bind(fs);
  const origReaddir = fs.readdir.bind(fs);
  const origReaddirSync = fs.readdirSync.bind(fs);

  const {isEscape} = escapeFunction(roots);

  const logged: {[k: string]: boolean} = {};

  // tslint:disable-next-line:no-any
  fs.lstat = (...args: any[]) => {
    const ekey = new Error('').stack || '';
    if (!logged[ekey]) {
      logged[ekey] = true;
    }

    let cb = args.length > 1 ? args[args.length - 1] : undefined;
    // preserve error when calling function without required callback.
    if (cb) {
      cb = once(cb);
      args[args.length - 1] = (err: Error, stats: Stats) => {
        if (err) return cb(err);

        const linkPath = path.resolve(args[0]);
        if (!stats.isSymbolicLink()) {
          return cb(null, stats);
        }

        return origReadlink(args[0], (err: Error&{code: string}, str: string) => {
          if (err) {
            if (err.code === 'ENOENT') {
              return cb(null, stats);
            } else if (err.code === 'EINVAL') {
              // readlink only returns einval when the target is not a link.
              // so if we found a link and it's no longer a link someone raced file system
              // modifications. we return the error but a strong case could be made to return the
              // original stat.
              return cb(err);
            } else {
              // some other file system related error.
              return cb(err);
            }
          }

          str = path.resolve(path.dirname(args[0]), str);

          if (isEscape(str, args[0])) {
            // if it's an out link we have to return the original stat.
            return origStat(args[0], (err: Error&{code: string}, plainStat: Stats) => {
              if (err && err.code === 'ENOENT') {
                // broken symlink. return link stats.
                return cb(null, stats);
              }
              cb(err, plainStat);
            });
          }
          // its a symlink and its inside of the root.
          cb(null, stats);
        });
      };
    }
    origLstat(...args);
  };

  // tslint:disable-next-line:no-any
  fs.realpath = (...args: any[]) => {
    let cb = args.length > 1 ? args[args.length - 1] : undefined;
    if (cb) {
      cb = once(cb);
      args[args.length - 1] = (err: Error, str: string) => {
        if (err) return cb(err);
        if (isEscape(str, args[0])) {
          cb(null, path.resolve(args[0]));
        } else {
          cb(null, str);
        }
      };
    }
    origRealpath(...args);
  };

  fs.realpath.native =
      (...args) => {
        let cb = args.length > 1 ? args[args.length - 1] : undefined;
        if (cb) {
          cb = once(cb);
          args[args.length - 1] = (err: Error, str: string) => {
            if (err) return cb(err);
            if (isEscape(str, args[0])) {
              cb(null, path.resolve(args[0]));
            } else {
              cb(null, str);
            }
          };
        }
        origRealpathNative(...args)
      }

                   // tslint:disable-next-line:no-any
                   fs.readlink = (...args: any[]) => {
        let cb = args.length > 1 ? args[args.length - 1] : undefined;
        if (cb) {
          cb = once(cb);
          args[args.length - 1] = (err: Error, str: string) => {
            args[0] = path.resolve(args[0]);
            if (str) str = path.resolve(path.dirname(args[0]), str);

            if (err) return cb(err);

            if (isEscape(str, args[0])) {
              const e = new Error('EINVAL: invalid argument, readlink \'' + args[0] + '\'');
              // tslint:disable-next-line:no-any
              (e as any).code = 'EINVAL';
              // if its not supposed to be a link we have to trigger an EINVAL error.
              return cb(e);
            }
            cb(null, str);
          };
        }
        origReadlink(...args);
      };

  // tslint:disable-next-line:no-any
  fs.lstatSync = (...args: any[]) => {
    const stats = origLstatSync(...args);
    const linkPath = path.resolve(args[0]);
    if (!stats.isSymbolicLink()) {
      return stats;
    }
    let linkTarget: string;
    try {
      linkTarget = path.resolve(path.dirname(args[0]), origReadlinkSync(linkPath));
    } catch (e) {
      if (e.code === 'ENOENT') {
        return stats;
      }
      throw e;
    }

    if (isEscape(linkTarget, linkPath)) {
      try {
        return origStatSync(...args);
      } catch (e) {
        // enoent means we have a broken link.
        // broken links that escape are returned as lstat results
        if (e.code !== 'ENOENT') {
          throw e;
        }
      }
    }
    return stats;
  };

  // tslint:disable-next-line:no-any
  fs.realpathSync = (...args: any[]) => {
    const str = origRealpathSync(...args);
    if (isEscape(str, args[0])) {
      return path.resolve(args[0]);
    }
    return str;
  };

  // tslint:disable-next-line:no-any
  fs.realpathSync.native = (...args: any[]) => {
    const str = origRealpathSyncNative(...args);
    if (isEscape(str, args[0])) {
      return path.resolve(args[0]);
    }
    return str;
  };

  // tslint:disable-next-line:no-any
  fs.readlinkSync = (...args: any[]) => {
    args[0] = path.resolve(args[0]);

    const str = path.resolve(path.dirname(args[0]), origReadlinkSync(...args));
    if (isEscape(str, args[0]) || str === args[0]) {
      const e = new Error('EINVAL: invalid argument, readlink \'' + args[0] + '\'');
      // tslint:disable-next-line:no-any
      (e as any).code = 'EINVAL';
      throw e;
    }
    return str;
  };

  // tslint:disable-next-line:no-any
  fs.readdir = (...args: any[]) => {
    const p = path.resolve(args[0]);

    let cb = args[args.length - 1];
    if (typeof cb !== 'function') {
      // this will likely throw callback required error.
      return origReaddir(...args);
    }

    cb = once(cb);
    args[args.length - 1] = (err: Error, result: Dirent[]) => {
      if (err) return cb(err);
      // user requested withFileTypes
      if (result[0] && result[0].isSymbolicLink) {
        Promise.all(result.map((v: Dirent) => handleDirent(p, v)))
            .then(() => {
              cb(null, result);
            })
            .catch(err => {
              cb(err);
            });
      } else {
        // string array return for readdir.
        cb(null, result);
      }
    };

    origReaddir(...args);
  };

  // tslint:disable-next-line:no-any
  fs.readdirSync = (...args: any[]) => {
    const res = origReaddirSync(...args);
    const p = path.resolve(args[0]);
    // tslint:disable-next-line:no-any
    res.forEach((v: Dirent|any) => {
      handleDirentSync(p, v);
    });
    return res;
  };

  // i need to use this twice in bodt readdor and readdirSync. maybe in fs.Dir
  // tslint:disable-next-line:no-any
  function patchDirent(dirent: Dirent|any, stat: Stats|any) {
    // add all stat is methods to Dirent instances with their result.
    for (const i in stat) {
      if (i.indexOf('is') === 0 && typeof stat[i] === 'function') {
        //
        const result = stat[i]();
        if (result)
          dirent[i] = () => true;
        else
          dirent[i] = () => false;
      }
    }
  }

  if (fs.opendir) {
    const origOpendir = fs.opendir.bind(fs);
    // tslint:disable-next-line:no-any
    fs.opendir = (...args: any[]) => {
      let cb = args[args.length - 1];
      // if this is not a function opendir should throw an error.
      // we call it so we don't have to throw a mock
      if (typeof cb === 'function') {
        cb = once(cb);
        args[args.length - 1] = async (err: Error, dir: Dir) => {
          try {
            cb(null, await handleDir(dir));
          } catch (e) {
            cb(e);
          }
        };
        origOpendir(...args);
      } else {
        return origOpendir(...args).then((dir: Dir) => {
          return handleDir(dir);
        });
      }
    };
  }

  async function handleDir(dir: Dir) {
    const p = path.resolve(dir.path);
    const origIterator = dir[Symbol.asyncIterator].bind(dir);
    // tslint:disable-next-line:no-any
    const origRead: any = dir.read.bind(dir);

    dir[Symbol.asyncIterator] = async function*() {
      for await (const entry of origIterator()) {
        await handleDirent(p, entry);
        yield entry;
      }
    };

    // tslint:disable-next-line:no-any
    (dir.read as any) = async (...args: any[]) => {
      if (typeof args[args.length - 1] === 'function') {
        const cb = args[args.length - 1];
        args[args.length - 1] = async (err: Error, entry: Dirent) => {
          cb(err, entry ? await handleDirent(p, entry) : null);
        };
        origRead(...args);
      } else {
        const entry = await origRead(...args);
        if (entry) {
          await handleDirent(p, entry);
        }
        return entry;
      }
    };
    // tslint:disable-next-line:no-any
    const origReadSync: any = dir.readSync.bind(dir);
    // tslint:disable-next-line:no-any
    (dir.readSync as any) = () => {
      return handleDirentSync(p, origReadSync());
    };

    return dir;
  }
  let handleCounter = 0
  function handleDirent(p: string, v: Dirent): Promise<Dirent> {
    handleCounter++;
    return new Promise((resolve, reject) => {
      if (fs.DEBUG)
        console.error(
            handleCounter + ' opendir: found link? ', path.join(p, v.name), v.isSymbolicLink());
      if (!v.isSymbolicLink()) {
        return resolve(v);
      }
      const linkName = path.join(p, v.name);
      origReadlink(linkName, (err: Error, target: string) => {
        if (err) {
          return reject(err);
        }

        if (fs.DEBUG)
          console.error(
              handleCounter + ' opendir: escapes? [target]', path.resolve(target),
              '[link] ' + linkName, isEscape(path.resolve(target), linkName), roots);

        if (!isEscape(path.resolve(target), linkName)) {
          return resolve(v);
        }

        fs.stat(target, (err: Error&{code: string}, stat: Stats) => {
          if (err) {
            if (err.code === 'ENOENT') {
              if (fs.DEBUG)
                console.error(
                    handleCounter + ' opendir: broken link! resolving to link ',
                    path.resolve(target));
              // this is a broken symlink
              // even though this broken symlink points outside of the root
              // we'll return it.
              // the alternative choice here is to omit it from the directory listing altogether
              // this would add complexity because readdir output would be different than readdir
              // withFileTypes unless readdir was changed to match. if readdir was changed to match
              // it's performance would be greatly impacted because we would always have to use the
              // withFileTypes version which is slower.
              return resolve(v);
            }
            // transient fs related error. busy etc.
            return reject(err);
          }

          if (fs.DEBUG)
            console.error(
                handleCounter + ' opendir: patching dirent to look like it\'s target',
                path.resolve(target));
          // add all stat is methods to Dirent instances with their result.
          patchDirent(v, stat);
          v.isSymbolicLink = () => false;
          resolve(v);
        });
      });
    });
  }

  function handleDirentSync(p: string, v: Dirent|null) {
    if (v && v.isSymbolicLink) {
      if (v.isSymbolicLink()) {
        // any errors thrown here are valid. things like transient fs errors
        const target = path.resolve(p, origReadlinkSync(path.join(p, v.name)));
        if (isEscape(target, path.join(p, v.name))) {
          // Dirent exposes file type so if we want to hide that this is a link
          // we need to find out if it's a file or directory.
          v.isSymbolicLink = () => false;
          // tslint:disable-next-line:no-any
          const stat: Stats|any = origStatSync(target);
          // add all stat is methods to Dirent instances with their result.
          patchDirent(v, stat);
        }
      }
    }
  }

  /**
   * patch fs.promises here.
   *
   * this requires a light touch because if we trigger the getter on older nodejs versions
   * it will log an experimental warning to stderr
   *
   * `(node:62945) ExperimentalWarning: The fs.promises API is experimental`
   *
   * this api is available as experimental without a flag so users can access it at any time.
   */
  const promisePropertyDescriptor = Object.getOwnPropertyDescriptor(fs, 'promises');
  if (promisePropertyDescriptor) {
    // tslint:disable-next-line:no-any
    const promises: any = {};
    promises.lstat = util.promisify(fs.lstat);
    // NOTE: node core uses the newer realpath function fs.promises.native instead of fs.realPath
    promises.realpath = util.promisify(fs.realpath.native);
    promises.readlink = util.promisify(fs.readlink);
    promises.readdir = util.promisify(fs.readdir);
    if (fs.opendir) promises.opendir = util.promisify(fs.opendir);
    // handle experimental api warnings.
    // only applies to version of node where promises is a getter property.
    if (promisePropertyDescriptor.get) {
      const oldGetter = promisePropertyDescriptor.get.bind(fs);
      const cachedPromises = {};

      promisePropertyDescriptor.get = () => {
        const _promises = oldGetter();
        Object.assign(cachedPromises, _promises, promises);
        return cachedPromises;
      };
      Object.defineProperty(fs, 'promises', promisePropertyDescriptor);
    } else {
      // api can be patched directly
      Object.assign(fs.promises, promises);
    }
  }
};

export function isOutPath(root: string, str: string) {
  if (!root)
    return true;
  let strParts = str.split(path.sep);
  let rootParts = root.split(path.sep);
  let i=0;
  for (; i<rootParts.length && i<strParts.length; i++) {
    if (rootParts[i] === strParts[i] || rootParts[i] === '*') {
      continue;
    }
    break;
  }
  return i<rootParts.length;
}

export const escapeFunction = (roots: string[]) => {
  // ensure roots are always absolute
  roots = roots.map(root => path.resolve(root));
  function isEscape(linkTarget: string, linkPath: string) {
    if (!path.isAbsolute(linkPath)) {
      linkPath = path.resolve(linkPath);
    }

    if (!path.isAbsolute(linkTarget)) {
      linkTarget = path.resolve(linkTarget);
    }

    for (const root of roots) {
      if (isOutPath(root, linkTarget) && !isOutPath(root, linkPath)) {
        // don't escape out of the root
        return true;
      }
    }

    return false;
  }

  return {isEscape, isOutPath};
};

function once<T>(fn: (...args: unknown[]) => T) {
  let called = false;

  return (...args: unknown[]) => {
    if (called) return;
    called = true;

    let err: Error|false = false;
    try {
      fn(...args);
    } catch (_e) {
      err = _e;
    }

    // blow the stack to make sure this doesn't fall into any unresolved promise contexts
    if (err) {
      setImmediate(() => {
        throw err;
      });
    }
  };
}

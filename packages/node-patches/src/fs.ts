import { Stats, Dirent } from 'fs';
import * as path from 'path';
import * as util from 'util';
// using require here on purpose so we can override methods with any
// also even though imports are mutable in typescript the cognitive dissonance is too high because es modules
const _fs = require('fs');

//tslint:disable-next-line:no-any
export const patcher = (fs: any, root: string) => {
  fs = fs || _fs;
  root = root || process.env.BAZEL_SYMLINK_PATCHER_ROOT || '';
  if (root) root = fs.realpathSync(root);

  const origRealpath = fs.realpath.bind(fs);
  const origLstat = fs.lstat.bind(fs);
  const origReadlink = fs.readlink.bind(fs);
  const origLstatSync = fs.lstatSync.bind(fs);
  const origRealpathSync = fs.realpathSync.bind(fs);
  const origReadlinkSync = fs.readlinkSync.bind(fs);
  const origReaddir = fs.readdir.bind(fs);
  const origReaddirSync = fs.readdirSync.bind(fs);

  function isOutPath(str: string) {
    return !root || (!str.startsWith(root + path.sep) && str !== root);
  }

  //tslint:disable-next-line:no-any
  fs.lstat = (...args: any[]) => {
    const cb = args.length > 1 ? args[args.length - 1] : undefined;
    // preserve error when calling function without required callback.
    if (cb) {
      args[args.length - 1] = (err: Error, stats: Stats) => {
        if (err) return cb(err);
        if (stats.isSymbolicLink()) {
          if (root) {
            return origRealpath(
              args[0],
              (err: Error & { code: string }, str: string) => {
                // if realpath returns an ENOENT error we know this is an invalid link.
                // lstat doesn't return an error when stating invalid links so we return the original stat.
                // the only way to read this link without throwing is to use readlink and we'll patch that below.
                if (err && err.code === 'ENOENT') {
                  return cb(false, stats);
                } else if (err) {
                  // some other file system related error
                  return cb(err);
                }

                if (isOutPath(str)) {
                  // if it's an out link we have to return the original stat.
                  return fs.stat(args[0], cb);
                }
                // its a symlink and its inside of the root.
                cb(false, stats);
              }
            );
          }
        }
      };
    }
    origLstat(...args);
  };

  //tslint:disable-next-line:no-any
  fs.realpath = (...args: any[]) => {
    const cb = args.length > 1 ? args[args.length - 1] : undefined;
    if (cb) {
      args[args.length - 1] = (err: Error, str: string) => {
        if (err) return cb(err);
        if (isOutPath(str)) {
          cb(false, path.resolve(args[0]));
        } else {
          cb(false, str);
        }
      };
    }
    origRealpath(...args);
  };

  //tslint:disable-next-line:no-any
  fs.readlink = (...args: any[]) => {
    const cb = args.length > 1 ? args[args.length - 1] : undefined;
    if (cb) {
      args[args.length - 1] = (err: Error, str: string) => {
        if (err) return cb(err);
        if (isOutPath(str)) {
          const e = new Error(
            "EINVAL: invalid argument, readlink '" + args[0] + "'"
          );
          //tslint:disable-next-line:no-any
          (e as any).code = 'EINVAL';
          // if its not supposed to be a link we have to trigger an EINVAL error.
          cb(e);
        } else {
          cb(false, str);
        }
      };
    }
    origReadlink(...args);
  };

  //tslint:disable-next-line:no-any
  fs.lstatSync = (...args: any[]) => {
    let stats = origLstatSync(...args);
    if (stats.isSymbolicLink() && isOutPath(origRealpathSync(args[0]))) {
      stats = fs.statSync(...args);
    }
    return stats;
  };

  //tslint:disable-next-line:no-any
  fs.realpathSync = (...args: any[]) => {
    const str = origRealpathSync(...args);
    if (isOutPath(str)) {
      return path.resolve(args[0]);
    }
    return str;
  };

  //tslint:disable-next-line:no-any
  fs.readlinkSync = (...args: any[]) => {
    const str = origReadlinkSync(...args);
    if (isOutPath(str)) {
      const e = new Error(
        "EINVAL: invalid argument, readlink '" + args[0] + "'"
      );
      //tslint:disable-next-line:no-any
      (e as any).code = 'EINVAL';
      throw e;
    }
    return str;
  };

  //tslint:disable-next-line:no-any
  fs.readdir = (...args: any[]) => {
    const p = path.resolve(args[0]);

    const cb = args[args.length - 1];
    if (typeof cb !== 'function') {
      // this will likely throw callback required error.
      return origReaddir(...args);
    }

    args[args.length - 1] = (err: Error, result: Dirent[]) => {
      if (err) return cb(err);
      // user requested withFileTypes
      if (result[0] && result[0].isSymbolicLink) {
        // the point of the map is to await all the promises not to collect the results.
        Promise.all(
          result.map((v: Dirent) => {
            return new Promise((resolve, reject) => {
              if (v.isSymbolicLink()) {
                origReadlink(
                  path.join(p, v.name),
                  (err: Error, target: string) => {
                    if (err) {
                      return reject(err);
                    }

                    if (isOutPath(target)) {
                      fs.stat(
                        target,
                        (err: Error & { code: string }, stat: Stats) => {
                          if (err) {
                            if (err.code === 'ENOENT') {
                              // this is a broken symlink
                              // even though this broken symlink points outside of the root
                              // we'll return it.
                              // the alternative choice here is to omit it from the directory listing altogether
                              // this would add complexity because readdir output would be different than readdir withFileTypes
                              // unless readdir was changed to match. if readdir was changed to match it's performance would be
                              // greatly impacted because we would always have to use the withFileTypes version which is slower.
                              return resolve(v);
                            }
                            // transient fs related error. busy etc.
                            return reject(err);
                          }

                          // add all stat is methods to Dirent instances with their result.
                          patchDirent(v, stat);
                          v.isSymbolicLink = () => false;
                          resolve(v);
                        }
                      );
                      return;
                    }
                    resolve(v);
                  }
                );
                return;
              }
              resolve(v);
            });
          })
        )
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

  //tslint:disable-next-line:no-any
  fs.readdirSync = (...args: any[]) => {
    const res = origReaddirSync(...args);
    const p = path.resolve(args[0]);
    //tslint:disable-next-line:no-any
    res.forEach((v: Dirent | any) => {
      if (v && v.isSymbolicLink) {
        if (v.isSymbolicLink()) {
          // any errors thrown here are valid. things like transient fs errors
          const target = path.resolve(
            p,
            origReadlinkSync(path.join(p, v.name))
          );
          if (isOutPath(target)) {
            // Dirent exposes file type so if we want to hide that this is a link
            // we need to find out if it's a file or directory.
            v.isSymbolicLink = () => false;
            //tslint:disable-next-line:no-any
            const stat: Stats | any = fs.statSync(target);
            // add all stat is methods to Dirent instances with their result.
            patchDirent(v, stat);
          }
        }
      }
    });
    return res;
  };

  // i need to use this twice in bodt readdor and readdirSync. maybe in fs.Dir
  //tslint:disable-next-line:no-any
  function patchDirent(dirent: Dirent | any, stat: Stats | any) {
    // add all stat is methods to Dirent instances with their result.
    for (const i in stat) {
      if (i.indexOf('is') === 0 && typeof stat[i] === 'function') {
        const result = stat[i]();
        if (result) dirent[i] = () => true;
        else dirent[i] = () => false;
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
  const promisePropertyDescriptor = Object.getOwnPropertyDescriptor(
    fs,
    'promises'
  );
  if (promisePropertyDescriptor) {
    //tslint:disable-next-line:no-any
    const promises: any = {};
    promises.lstat = util.promisify(fs.lstat);
    promises.realpath = util.promisify(fs.realpath);
    promises.readlink = util.promisify(fs.readlink);
    promises.readdir = util.promisify(fs.readdir);
    // handle experimental api warnings.
    // only applies to version of node where promises is a getter property.
    if (promisePropertyDescriptor.get) {
      const oldGetter = promisePropertyDescriptor.get.bind(fs);
      promisePropertyDescriptor.get = () => {
        const _promises = oldGetter();

        fs.promises = _promises;
      };
      Object.defineProperty(fs, 'promises', promisePropertyDescriptor);
    } else {
      // api can be patched directly
      Object.assign(fs.promises, promises);
    }
  }

  if (fs.Dir) {
    /*
    class Dir extends fs.Dir{
      //tslint:disable-next-line:no-any
      constructor(handle:any, path:any, options:any){
        super(handle, path, options)
      }

      read(){}

    }

    fs.Dir = Dir;
    */
  }
};

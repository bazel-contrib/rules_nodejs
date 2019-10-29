import { Stats } from 'fs';
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

  let promises = false;
  if (fs.promises) {
    promises = true;
  }

  const origRealpath = fs.realpath.bind(fs);
  const origLstat = fs.lstat.bind(fs);
  const origReadlink = fs.readlink.bind(fs);
  const origLstatSync = fs.lstatSync.bind(fs);
  const origRealpathSync = fs.realpathSync.bind(fs);
  const origReadlinkSync = fs.readlinkSync.bind(fs);

  function isOutLink(str: string) {
    return root && (str.startsWith(root + path.sep) || str === root);
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

                if (isOutLink(str)) {
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
        if (isOutLink(str)) {
          cb(false, path.resolve(args[0]));
        } else {
          cb(false, str);
        }
      };
    }
    origRealpath(...args);
  };

  // this leaks the patch a bit.
  // readlink will return the absolute path of the link it read
  // but if its an "out link" read link has to return the same path it just read
  // its unlikely that a user program will depend on readlink returning a different
  // string than was passed in but its possible.
  // with the other fs patches in place the only way to hit this is to blindly readlink
  // without stating first.
  //tslint:disable-next-line:no-any
  fs.readlink = (...args: any[]) => {
    const cb = args.length > 1 ? args[args.length - 1] : undefined;
    if (cb) {
      args[args.length - 1] = (err: Error, str: string) => {
        if (err) return cb(err);
        if (isOutLink(str)) {
          const e =  new Error('EINVAL: invalid argument, readlink \''+args[0]+'\'');
          //tslint:disable-next-line:no-any
          (e as any).code = 'EINVAL';
          // if its not supposed to be a link we have to trigger an EINAVL error.
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
    if (stats.isSymbolicLink() && isOutLink(origRealpathSync(args[0]))) {
      stats = fs.statSync(...args);
    }
    return stats;
  };

  //tslint:disable-next-line:no-any
  fs.realpathSync = (...args: any[]) => {
    const str = origRealpathSync(...args);
    if (isOutLink(str)) {
      return path.resolve(str);
    }
    return str;
  };

  //tslint:disable-next-line:no-any
  fs.readlinkSync = (...args: any[]) => {
    let str = origReadlinkSync(...args);
    if (isOutLink(origRealpathSync(str))) {
      const e =  new Error('EINVAL: invalid argument, readlink \''+args[0]+'\'');
      //tslint:disable-next-line:no-any
      (e as any).code = 'EINVAL';
      throw e;
    }
    return str;
  };


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
  const promisePropertyDescriptor = Object.getOwnPropertyDescriptor(fs,'promises');
  if(promisePropertyDescriptor){
    //tslint:disable-next-line:no-any
    let promises:any = {};
    promises.lstat = util.promisify(fs.lstat);
    promises.realpath = util.promisify(fs.realpath);
    promises.readlink = util.promisify(fs.readlink);

    // handle experimental api patching
    if(promisePropertyDescriptor.get){

      let oldGetter = promisePropertyDescriptor.get.bind(fs)
      promisePropertyDescriptor.get = ()=>{
        let _promises = oldGetter()

        fs.promises = _promises
      }
      Object.defineProperty(fs,'promises',promisePropertyDescriptor);

    } else {
      // api can be patched directly
      Object.assign(fs.promises,promises);
    }
  }

  if(fs.Dir){
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

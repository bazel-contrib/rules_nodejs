// clang-format off

'use strict';

var path$1 = require('path');
var util = require('util');

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
var __asyncValues = (undefined && undefined.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (undefined && undefined.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); };
var __asyncGenerator = (undefined && undefined.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
// using require here on purpose so we can override methods with any
// also even though imports are mutable in typescript the cognitive dissonance is too high because
// es modules
const _fs = require('fs');
// tslint:disable-next-line:no-any
const patcher = (fs = _fs, root) => {
    fs = fs || _fs;
    root = root || '';
    if (!root) {
        if (process.env.VERBOSE_LOGS) {
            console.error('fs patcher called without root path ' + __filename);
        }
        return;
    }
    root = fs.realpathSync(root);
    const origRealpath = fs.realpath.bind(fs);
    const origLstat = fs.lstat.bind(fs);
    const origStat = fs.stat.bind(fs);
    const origStatSync = fs.statSync.bind(fs);
    const origReadlink = fs.readlink.bind(fs);
    const origLstatSync = fs.lstatSync.bind(fs);
    const origRealpathSync = fs.realpathSync.bind(fs);
    const origReadlinkSync = fs.readlinkSync.bind(fs);
    const origReaddir = fs.readdir.bind(fs);
    const origReaddirSync = fs.readdirSync.bind(fs);
    const { isEscape, isOutPath } = escapeFunction(root);
    // tslint:disable-next-line:no-any
    fs.lstat = (...args) => {
        let cb = args.length > 1 ? args[args.length - 1] : undefined;
        // preserve error when calling function without required callback.
        if (cb) {
            cb = once(cb);
            args[args.length - 1] = (err, stats) => {
                if (err)
                    return cb(err);
                const linkPath = path$1.resolve(args[0]);
                // if this is not a symlink or the path is not inside the root it has no way to escape.
                if (!stats.isSymbolicLink() || !root || isOutPath(linkPath)) {
                    return cb(null, stats);
                }
                return origReadlink(args[0], (err, str) => {
                    if (err) {
                        if (err.code === 'ENOENT') {
                            return cb(false, stats);
                        }
                        else if (err.code === 'EINVAL') {
                            // readlink only returns einval when the target is not a link.
                            // so if we found a link and it's no longer a link someone raced file system
                            // modifications. we return the error but a strong case could be made to return the
                            // original stat.
                            return cb(err);
                        }
                        else {
                            // some other file system related error.
                            return cb(err);
                        }
                    }
                    str = path$1.resolve(path$1.dirname(args[0]), str);
                    if (isEscape(str, args[0])) {
                        // if it's an out link we have to return the original stat.
                        return origStat(args[0], (err, plainStat) => {
                            if (err && err.code === 'ENOENT') {
                                // broken symlink. return link stats.
                                return cb(null, stats);
                            }
                            cb(err, plainStat);
                        });
                    }
                    // its a symlink and its inside of the root.
                    cb(false, stats);
                });
            };
        }
        origLstat(...args);
    };
    // tslint:disable-next-line:no-any
    fs.realpath = (...args) => {
        let cb = args.length > 1 ? args[args.length - 1] : undefined;
        if (cb) {
            cb = once(cb);
            args[args.length - 1] = (err, str) => {
                if (err)
                    return cb(err);
                if (isEscape(str, args[0])) {
                    cb(false, path$1.resolve(args[0]));
                }
                else {
                    cb(false, str);
                }
            };
        }
        origRealpath(...args);
    };
    // tslint:disable-next-line:no-any
    fs.readlink = (...args) => {
        let cb = args.length > 1 ? args[args.length - 1] : undefined;
        if (cb) {
            cb = once(cb);
            args[args.length - 1] = (err, str) => {
                args[0] = path$1.resolve(args[0]);
                if (str)
                    str = path$1.resolve(path$1.dirname(args[0]), str);
                if (err)
                    return cb(err);
                if (isEscape(str, args[0])) {
                    const e = new Error('EINVAL: invalid argument, readlink \'' + args[0] + '\'');
                    // tslint:disable-next-line:no-any
                    e.code = 'EINVAL';
                    // if its not supposed to be a link we have to trigger an EINVAL error.
                    return cb(e);
                }
                cb(false, str);
            };
        }
        origReadlink(...args);
    };
    // tslint:disable-next-line:no-any
    fs.lstatSync = (...args) => {
        const stats = origLstatSync(...args);
        const linkPath = path$1.resolve(args[0]);
        // if this is not a symlink or the path is not inside the root it has no way to escape.
        if (!stats.isSymbolicLink() || isOutPath(linkPath))
            return stats;
        let linkTarget;
        try {
            linkTarget = path$1.resolve(path$1.dirname(args[0]), origReadlinkSync(linkPath));
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                return stats;
            }
            throw e;
        }
        if (isEscape(linkTarget, linkPath)) {
            try {
                return origStatSync(...args);
            }
            catch (e) {
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
    fs.realpathSync = (...args) => {
        const str = origRealpathSync(...args);
        if (isEscape(str, args[0])) {
            return path$1.resolve(args[0]);
        }
        return str;
    };
    // tslint:disable-next-line:no-any
    fs.readlinkSync = (...args) => {
        args[0] = path$1.resolve(args[0]);
        const str = path$1.resolve(path$1.dirname(args[0]), origReadlinkSync(...args));
        if (isEscape(str, args[0]) || str === args[0]) {
            const e = new Error('EINVAL: invalid argument, readlink \'' + args[0] + '\'');
            // tslint:disable-next-line:no-any
            e.code = 'EINVAL';
            throw e;
        }
        return str;
    };
    // tslint:disable-next-line:no-any
    fs.readdir = (...args) => {
        const p = path$1.resolve(args[0]);
        let cb = args[args.length - 1];
        if (typeof cb !== 'function') {
            // this will likely throw callback required error.
            return origReaddir(...args);
        }
        cb = once(cb);
        args[args.length - 1] = (err, result) => {
            if (err)
                return cb(err);
            // user requested withFileTypes
            if (result[0] && result[0].isSymbolicLink) {
                Promise.all(result.map((v) => handleDirent(p, v)))
                    .then(() => {
                    cb(null, result);
                })
                    .catch(err => {
                    cb(err);
                });
            }
            else {
                // string array return for readdir.
                cb(null, result);
            }
        };
        origReaddir(...args);
    };
    // tslint:disable-next-line:no-any
    fs.readdirSync = (...args) => {
        const res = origReaddirSync(...args);
        const p = path$1.resolve(args[0]);
        // tslint:disable-next-line:no-any
        res.forEach((v) => {
            handleDirentSync(p, v);
        });
        return res;
    };
    // i need to use this twice in bodt readdor and readdirSync. maybe in fs.Dir
    // tslint:disable-next-line:no-any
    function patchDirent(dirent, stat) {
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
        fs.opendir = (...args) => {
            let cb = args[args.length - 1];
            // if this is not a function opendir should throw an error.
            // we call it so we don't have to throw a mock
            if (typeof cb === 'function') {
                cb = once(cb);
                args[args.length - 1] = async (err, dir) => {
                    try {
                        cb(null, await handleDir(dir));
                    }
                    catch (e) {
                        cb(e);
                    }
                };
                origOpendir(...args);
            }
            else {
                return origOpendir(...args).then((dir) => {
                    return handleDir(dir);
                });
            }
        };
    }
    async function handleDir(dir) {
        const p = path$1.resolve(dir.path);
        const origIterator = dir[Symbol.asyncIterator].bind(dir);
        // tslint:disable-next-line:no-any
        const origRead = dir.read.bind(dir);
        dir[Symbol.asyncIterator] = function () {
            return __asyncGenerator(this, arguments, function* () {
                var e_1, _a;
                try {
                    for (var _b = __asyncValues(origIterator()), _c; _c = yield __await(_b.next()), !_c.done;) {
                        const entry = _c.value;
                        yield __await(handleDirent(p, entry));
                        yield yield __await(entry);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) yield __await(_a.call(_b));
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            });
        };
        // tslint:disable-next-line:no-any
        dir.read = async (...args) => {
            if (typeof args[args.length - 1] === 'function') {
                const cb = args[args.length - 1];
                args[args.length - 1] = async (err, entry) => {
                    cb(err, entry ? await handleDirent(p, entry) : null);
                };
                origRead(...args);
            }
            else {
                const entry = await origRead(...args);
                if (entry) {
                    await handleDirent(p, entry);
                }
                return entry;
            }
        };
        // tslint:disable-next-line:no-any
        const origReadSync = dir.readSync.bind(dir);
        // tslint:disable-next-line:no-any
        dir.readSync = () => {
            return handleDirentSync(p, origReadSync());
        };
        return dir;
    }
    let handleCounter = 0;
    function handleDirent(p, v) {
        handleCounter++;
        return new Promise((resolve, reject) => {
            if (fs.DEBUG)
                console.error(handleCounter + ' opendir: found link? ', path$1.join(p, v.name), v.isSymbolicLink());
            if (!v.isSymbolicLink()) {
                return resolve(v);
            }
            const linkName = path$1.join(p, v.name);
            origReadlink(linkName, (err, target) => {
                if (err) {
                    return reject(err);
                }
                if (fs.DEBUG)
                    console.error(handleCounter + ' opendir: escapes? [target]', path$1.resolve(target), '[link] ' + linkName, isEscape(path$1.resolve(target), linkName), root);
                if (!isEscape(path$1.resolve(target), linkName)) {
                    return resolve(v);
                }
                fs.stat(target, (err, stat) => {
                    if (err) {
                        if (err.code === 'ENOENT') {
                            if (fs.DEBUG)
                                console.error(handleCounter + ' opendir: broken link! resolving to link ', path$1.resolve(target));
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
                        console.error(handleCounter + ' opendir: patching dirent to look like it\'s target', path$1.resolve(target));
                    // add all stat is methods to Dirent instances with their result.
                    patchDirent(v, stat);
                    v.isSymbolicLink = () => false;
                    resolve(v);
                });
            });
        });
    }
    function handleDirentSync(p, v) {
        if (v && v.isSymbolicLink) {
            if (v.isSymbolicLink()) {
                // any errors thrown here are valid. things like transient fs errors
                const target = path$1.resolve(p, origReadlinkSync(path$1.join(p, v.name)));
                if (isEscape(target, path$1.join(p, v.name))) {
                    // Dirent exposes file type so if we want to hide that this is a link
                    // we need to find out if it's a file or directory.
                    v.isSymbolicLink = () => false;
                    // tslint:disable-next-line:no-any
                    const stat = origStatSync(target);
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
        const promises = {};
        promises.lstat = util.promisify(fs.lstat);
        promises.realpath = util.promisify(fs.realpath);
        promises.readlink = util.promisify(fs.readlink);
        promises.readdir = util.promisify(fs.readdir);
        if (fs.opendir)
            promises.opendir = util.promisify(fs.opendir);
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
        }
        else {
            // api can be patched directly
            Object.assign(fs.promises, promises);
        }
    }
};
const escapeFunction = (root) => {
    // ensure root is always absolute.
    root = path$1.resolve(root);
    function isEscape(linkTarget, linkPath) {
        if (!path$1.isAbsolute(linkPath)) {
            linkPath = path$1.resolve(linkPath);
        }
        if (!path$1.isAbsolute(linkTarget)) {
            linkTarget = path$1.resolve(linkTarget);
        }
        if (root) {
            if (isOutPath(linkTarget) && !isOutPath(linkPath)) {
                return true;
            }
        }
        return false;
    }
    function isOutPath(str) {
        return !root || (!str.startsWith(root + path$1.sep) && str !== root);
    }
    return { isEscape, isOutPath };
};
function once(fn) {
    let called = false;
    return (...args) => {
        if (called)
            return;
        called = true;
        let err = false;
        try {
            fn(...args);
        }
        catch (_e) {
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

// this does not actually patch child_process
// but adds support to ensure the registered loader is included in all nested executions of nodejs.
const fs = require('fs');
const path = require('path');
const patcher$1 = (requireScriptName, binDir) => {
    requireScriptName = path.resolve(requireScriptName);
    const dir = path.dirname(requireScriptName);
    const file = path.basename(requireScriptName);
    const nodeDir = path.join(binDir || dir, '_node_bin');
    if (!process.env.NP_PATCHED_NODEJS) {
        // TODO: WINDOWS.
        fs.mkdirSync(nodeDir, { recursive: true });
        if (process.platform == 'win32') {
            fs.writeFileSync(path.join(nodeDir, 'node.bat'), `@if not defined DEBUG_HELPER @ECHO OFF
set NP_PATCHED_NODEJS=${nodeDir}
set Path=${nodeDir};%Path%
"${process.execPath}" --require "${requireScriptName}" %*
        `);
        }
        else {
            fs.writeFileSync(path.join(nodeDir, 'node'), `#!/bin/bash
export NP_PATCHED_NODEJS=${nodeDir}
export PATH=${nodeDir}:$PATH
hasScript=\`echo "$@" | grep ${path.basename(requireScriptName)}\`
if [ "$hasScript"=="" ]; then
  exec ${process.execPath} --require "${requireScriptName}" "$@"
else
  exec ${process.execPath} "$@"
fi
  `, { mode: 0o777 });
        }
    }
    if (!process.env.PATH) {
        process.env.PATH = nodeDir;
    }
    else if (process.env.PATH.indexOf(nodeDir + path.delimiter) === -1) {
        process.env.PATH = nodeDir + path.delimiter + process.env.PATH;
    }
    // fix execPath so folks use the proxy node
    process.argv[0] = process.execPath = path.join(nodeDir, 'node');
    // replace any instances of require script in execArgv with the absolute path to the script.
    // example: bazel-require-script.js
    process.execArgv.map(v => {
        if (v.indexOf(file) > -1) {
            return requireScriptName;
        }
        return v;
    });
};

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
const fs$1 = patcher;
const subprocess = patcher$1;

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
// todo auto detect bazel env vars instead of adding a new one.
const { BAZEL_PATCH_ROOT, NP_SUBPROCESS_BIN_DIR, VERBOSE_LOGS } = process.env;
if (BAZEL_PATCH_ROOT) {
    if (VERBOSE_LOGS)
        console.error(`bazel node patches enabled. root: ${BAZEL_PATCH_ROOT} symlinks in this directory will not escape`);
    const fs = require('fs');
    fs$1(fs, BAZEL_PATCH_ROOT);
}
else if (VERBOSE_LOGS) {
    console.error(`bazel node patches disabled. set environment BAZEL_PATCH_ROOT`);
}
subprocess(__filename, NP_SUBPROCESS_BIN_DIR);

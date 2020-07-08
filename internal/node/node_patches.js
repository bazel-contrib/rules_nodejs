// clang-format off
'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var util = _interopDefault(require('util'));
var fs$1 = _interopDefault(require('fs'));

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var fs = createCommonjsModule(function (module, exports) {
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
var __asyncValues = (commonjsGlobal && commonjsGlobal.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (commonjsGlobal && commonjsGlobal.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); };
var __asyncGenerator = (commonjsGlobal && commonjsGlobal.__asyncGenerator) || function (thisArg, _arguments, generator) {
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
Object.defineProperty(exports, "__esModule", { value: true });


// using require here on purpose so we can override methods with any
// also even though imports are mutable in typescript the cognitive dissonance is too high because
// es modules

// tslint:disable-next-line:no-any
exports.patcher = (fs = fs$1, root, guards) => {
    fs = fs || fs$1;
    root = root || '';
    guards = guards || [];
    if (!root) {
        if (process.env.VERBOSE_LOGS) {
            console.error('fs patcher called without root path ' + __filename);
        }
        return;
    }
    root = fs.realpathSync(root);
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
    const { isEscape } = exports.escapeFunction(root, guards);
    // tslint:disable-next-line:no-any
    fs.lstat = (...args) => {
        let cb = args.length > 1 ? args[args.length - 1] : undefined;
        // preserve error when calling function without required callback.
        if (cb) {
            cb = once(cb);
            args[args.length - 1] = (err, stats) => {
                if (err)
                    return cb(err);
                const linkPath = path.resolve(args[0]);
                if (!stats.isSymbolicLink()) {
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
                    str = path.resolve(path.dirname(args[0]), str);
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
                    cb(false, path.resolve(args[0]));
                }
                else {
                    cb(false, str);
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
                args[args.length - 1] = (err, str) => {
                    if (err)
                        return cb(err);
                    if (isEscape(str, args[0])) {
                        cb(false, path.resolve(args[0]));
                    }
                    else {
                        cb(false, str);
                    }
                };
            }
            origRealpathNative(...args);
        };
    // tslint:disable-next-line:no-any
    fs.readlink = (...args) => {
        let cb = args.length > 1 ? args[args.length - 1] : undefined;
        if (cb) {
            cb = once(cb);
            args[args.length - 1] = (err, str) => {
                args[0] = path.resolve(args[0]);
                if (str)
                    str = path.resolve(path.dirname(args[0]), str);
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
        const linkPath = path.resolve(args[0]);
        if (!stats.isSymbolicLink()) {
            return stats;
        }
        let linkTarget;
        try {
            linkTarget = path.resolve(path.dirname(args[0]), origReadlinkSync(linkPath));
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
            return path.resolve(args[0]);
        }
        return str;
    };
    // tslint:disable-next-line:no-any
    fs.realpathSync.native = (...args) => {
        const str = origRealpathSyncNative(...args);
        if (isEscape(str, args[0])) {
            return path.resolve(args[0]);
        }
        return str;
    };
    // tslint:disable-next-line:no-any
    fs.readlinkSync = (...args) => {
        args[0] = path.resolve(args[0]);
        const str = path.resolve(path.dirname(args[0]), origReadlinkSync(...args));
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
        const p = path.resolve(args[0]);
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
        const p = path.resolve(args[0]);
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
        const p = path.resolve(dir.path);
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
                console.error(handleCounter + ' opendir: found link? ', path.join(p, v.name), v.isSymbolicLink());
            if (!v.isSymbolicLink()) {
                return resolve(v);
            }
            const linkName = path.join(p, v.name);
            origReadlink(linkName, (err, target) => {
                if (err) {
                    return reject(err);
                }
                if (fs.DEBUG)
                    console.error(handleCounter + ' opendir: escapes? [target]', path.resolve(target), '[link] ' + linkName, isEscape(path.resolve(target), linkName), root);
                if (!isEscape(path.resolve(target), linkName)) {
                    return resolve(v);
                }
                fs.stat(target, (err, stat) => {
                    if (err) {
                        if (err.code === 'ENOENT') {
                            if (fs.DEBUG)
                                console.error(handleCounter + ' opendir: broken link! resolving to link ', path.resolve(target));
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
                        console.error(handleCounter + ' opendir: patching dirent to look like it\'s target', path.resolve(target));
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
                const target = path.resolve(p, origReadlinkSync(path.join(p, v.name)));
                if (isEscape(target, path.join(p, v.name))) {
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
        // NOTE: node core uses the newer realpath function fs.promises.native instead of fs.realPath
        promises.realpath = util.promisify(fs.realpath.native);
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
exports.escapeFunction = (root, guards) => {
    // ensure root & guards are always absolute.
    root = path.resolve(root);
    guards = guards.map(g => path.resolve(g));
    function isEscape(linkTarget, linkPath) {
        if (!path.isAbsolute(linkPath)) {
            linkPath = path.resolve(linkPath);
        }
        if (!path.isAbsolute(linkTarget)) {
            linkTarget = path.resolve(linkTarget);
        }
        if (isGuardPath(linkPath) || isGuardPath(linkTarget)) {
            // don't escape out of guard paths and don't symlink into guard paths
            return true;
        }
        if (root) {
            if (isOutPath(linkTarget) && !isOutPath(linkPath)) {
                // don't escape out of the root
                return true;
            }
        }
        return false;
    }
    function isGuardPath(str) {
        for (const g of guards) {
            if (str === g || str.startsWith(g + path.sep))
                return true;
        }
        return false;
    }
    function isOutPath(str) {
        return !root || (!str.startsWith(root + path.sep) && str !== root);
    }
    return { isEscape, isGuardPath, isOutPath };
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
});

unwrapExports(fs);
var fs_1 = fs.patcher;
var fs_2 = fs.escapeFunction;

var subprocess = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
// this does not actually patch child_process
// but adds support to ensure the registered loader is included in all nested executions of nodejs.


exports.patcher = (requireScriptName, nodeDir) => {
    requireScriptName = path.resolve(requireScriptName);
    nodeDir = nodeDir || path.join(path.dirname(requireScriptName), '_node_bin');
    const file = path.basename(requireScriptName);
    try {
        fs$1.mkdirSync(nodeDir, { recursive: true });
    }
    catch (e) {
        // with node versions that don't have recursive mkdir this may throw an error.
        if (e.code !== 'EEXIST') {
            throw e;
        }
    }
    if (process.platform == 'win32') {
        const nodeEntry = path.join(nodeDir, 'node.bat');
        if (!fs$1.existsSync(nodeEntry)) {
            fs$1.writeFileSync(nodeEntry, `@if not defined DEBUG_HELPER @ECHO OFF
set NP_SUBPROCESS_NODE_DIR=${nodeDir}
set Path=${nodeDir};%Path%
"${process.execPath}" ${process.env.NODE_REPOSITORY_ARGS} --require "${requireScriptName}" %*
`);
        }
    }
    else {
        const nodeEntry = path.join(nodeDir, 'node');
        if (!fs$1.existsSync(nodeEntry)) {
            fs$1.writeFileSync(nodeEntry, `#!/bin/bash
export NP_SUBPROCESS_NODE_DIR="${nodeDir}"
export PATH="${nodeDir}":\$PATH
if [[ ! "\${@}" =~ "${file}" ]]; then
  exec ${process.execPath} ${process.env.NODE_REPOSITORY_ARGS} --require "${requireScriptName}" "$@"
else
  exec ${process.execPath} ${process.env.NODE_REPOSITORY_ARGS} "$@"
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
    if (process.platform == 'win32') ;
    else {
        process.argv[0] = process.execPath = path.join(nodeDir, 'node');
    }
    // replace any instances of require script in execArgv with the absolute path to the script.
    // example: bazel-require-script.js
    process.execArgv.map(v => {
        if (v.indexOf(file) > -1) {
            return requireScriptName;
        }
        return v;
    });
};
});

unwrapExports(subprocess);
var subprocess_1 = subprocess.patcher;

var src = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
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


exports.fs = fs.patcher;
exports.subprocess = subprocess.patcher;
});

unwrapExports(src);
var src_1 = src.fs;
var src_2 = src.subprocess;

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
/**
 * @fileoverview Description of this file.
 */

const { BAZEL_PATCH_ROOT, BAZEL_PATCH_GUARDS, NP_SUBPROCESS_NODE_DIR, VERBOSE_LOGS } = process.env;
if (BAZEL_PATCH_ROOT) {
    const guards = BAZEL_PATCH_GUARDS ? BAZEL_PATCH_GUARDS.split(',') : [];
    if (VERBOSE_LOGS)
        console.error(`bazel node patches enabled. root: ${BAZEL_PATCH_ROOT} symlinks in this directory will not escape`);
    const fs = fs$1;
    src.fs(fs, BAZEL_PATCH_ROOT, guards);
}
else if (VERBOSE_LOGS) {
    console.error(`bazel node patches disabled. set environment BAZEL_PATCH_ROOT`);
}
src.subprocess(__filename, NP_SUBPROCESS_NODE_DIR);

var register = {

};

module.exports = register;

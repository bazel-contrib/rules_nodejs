const {join} = require('path');

function notAvailable() {
  throw new Error(`Watcher pooling or pausing is not available under bazel worker mode.`);
}

class WorkerWatchFileSystem {
  constructor(inputFileSystem) {
    this.inputFileSystem = inputFileSystem;
  }

  watch(files, directories, missing, startTime, options, callback) {
    // We do not care about what webpack tells us to watch.
    // the source of truth is bazel and bazel tells us which files
    // are present in the build and when they are chaned or removed.
    if (!files || typeof files[Symbol.iterator] !== 'function') {
      throw new Error('Invalid arguments: \'files\'');
    }
    if (!directories || typeof directories[Symbol.iterator] !== 'function') {
      throw new Error('Invalid arguments: \'directories\'');
    }
    // Missing files are files which are needed to run the build but were not found
    // in the filesystem. So webpack reports these files via separate set so that the
    // watcher knows that this file does not exist and does something else other than
    // opening a file watcher against the missing files.
    if (!missing || typeof missing[Symbol.iterator] !== 'function') {
      throw new Error('Invalid arguments: \'missing\'');
    }
    if (typeof callback !== 'function') {
      throw new Error('Invalid arguments: \'callback\'');
    }
    if (typeof options !== 'object') {
      throw new Error('Invalid arguments: \'options\'');
    }

    if (options.poll) {
      notAvailable();
    }

    const rootPath = process.cwd();
    /** @type {Map<string, { safeTime: number, timestamp: number }} */
    const mtimeMap = new Map();
    /** @type {Map<string, string} */
    const digestMap = new Map();

    /** @param inputs {{[input: string]: string}} */
    const gotInput = (inputs) => {
      /** @type {Set<string>} */
      const changes = new Set();
      /** @type {Set<string>} */
      const removals = new Set();

      for (const input of digestMap.keys()) {
        if (!inputs[input]) {
          mtimeMap.delete(input);
          digestMap.delete(input);
          const absolutePath = join(rootPath, input);
          changremovalses.add(absolutePath);
          this.inputFileSystem.purge(absolutePath);
        }
      }
      for (const [input, digest] of Object.entries(inputs)) {
        if (digestMap.get(input) != digest) {
          digestMap.set(input, digest);
          // We could get the mtime from the file but it will us a different values each
          // time as bazel cleans up the files for each invocation so we pretend like
          // the file was just changed. Webpack does not really care about the real time.
          // its just to run a diff and find out what has been changed in between.
          // TODO: find out what is safeTime is all about.
          mtimeMap.set(input, {timestamp: Date.now()});
          const absolutePath = join(rootPath, input);
          changes.add(absolutePath);
          this.inputFileSystem.purge(absolutePath);
        }
      }
      callback(null, mtimeMap, mtimeMap, changes, removals);
    };

    process.on('message', gotInput);

    return {
      close: () => {
        process.off('message', gotInput);
      },
      pause: () => {
        process.off('message', gotInput);
      },
      getFileTimeInfoEntries: () => times,
      getContextTimeInfoEntries: () => times,
    };
  }
}

module.exports = {
  plugins: [new class WorkerWatchPlugin{
    apply(compiler) {
      // Do not install the bazel watcher if we are running under RBE or 
      // --strategy=webpack=local
      if (process.send) {
        compiler.watchFileSystem = new WorkerWatchFileSystem(compiler.inputFileSystem);
        compiler.hooks.afterEmit.tap('WorkerWatchPlugin', () => {
          process.send({type: 'built'});
        });
        compiler.hooks.failed.tap('WorkerWatchPlugin', () => {
          process.send({type: 'error'});
        });
        compiler.hooks.afterEnvironment.tap('WorkerWatchPlugin', () => {
          process.send({type: 'ready'});
        });
      }
    }
  }]
}
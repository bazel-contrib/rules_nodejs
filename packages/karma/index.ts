/*
 * Concat all JS files before serving.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import {createInterface} from 'readline';
import * as tmp from 'tmp';
///<reference types="lib.dom"/>

/**
 * Return SHA1 of data buffer.
 */
function sha1(data) {
  const hash = crypto.createHash('sha1');
  hash.update(data);
  return hash.digest('hex');
}

/**
 * Entry-point for the Karma plugin.
 */
function initConcatJs(logger, emitter, basePath, hostname, port) {
  const log = logger.create('framework.concat_js');

  // Create a tmp file for the concat bundle that is automatically cleaned up on
  // exit.
  const tmpFile = tmp.fileSync({keep: false, dir: process.env['TEST_TMPDIR']});

  emitter.on('file_list_modified', files => {
    const bundleFile = {
      path: '/concatjs_bundle.js',
      contentPath: tmpFile.name,
      isUrl: false,
      content: '',
      encodings: {},
    } as any;
    // Preserve all non-JS that were there in the included list.
    const included = files.included.filter(f => path.extname(f.originalPath) !== '.js');
    const bundledFiles =
        files.included.filter(f => path.extname(f.originalPath) === '.js').map((file) => {
          const relativePath = path.relative(basePath, file.originalPath).replace(/\\/g, '/');

          let content = file.content + `\n//# sourceURL=http://${hostname}:${port}/base/` +
              relativePath + '\n';

          return `
  loadFile(
      ${JSON.stringify(relativePath)},
      ${JSON.stringify(content)});`;
        });

    // Execute each file by putting it in a <script> tag. This makes them create
    // global variables, even with 'use strict'; (unlike eval).
    bundleFile.content = `
(function() {  // Hide local variables
  // IE 8 and below do not support document.head.
  var parent = document.getElementsByTagName('head')[0] ||
                    document.documentElement;
  function loadFile(path, src) {
    try {
      var script = document.createElement('script');
      if ('textContent' in script) {
        script.textContent = src;
      } else {
        // This is for IE 8 and below.
        script.text = src;
      }
      parent.appendChild(script);
      // Don't pollute the DOM with hundreds of <script> tags.
      parent.removeChild(script);
    } catch(err) {
      window.__karma__ && window.__karma__.error(
          'An error occurred while loading ' + path + ':\\n' +
          (err.stack || err.message || err.toString()));
      console.error('An error occurred while loading ' + path, err);
      throw err;
    }
  }
${bundledFiles.join('')}
})();`;
    bundleFile.sha = sha1(Buffer.from(bundleFile.content));
    bundleFile.mtime = new Date();
    included.unshift(bundleFile);

    files.included = included;
    files.served.push(bundleFile);

    log.debug('Writing concatjs bundle to tmp file %s', bundleFile.contentPath);
    fs.writeFileSync(bundleFile.contentPath, bundleFile.content);
  });
}

(initConcatJs as any).$inject =
    ['logger', 'emitter', 'config.basePath', 'config.hostname', 'config.port'];

function watcher(fileList: {refresh: () => void}) {
  // ibazel will write this string after a successful build
  // We don't want to re-trigger tests if the compilation fails, so
  // we should only listen for this event.
  const IBAZEL_NOTIFY_BUILD_SUCCESS = 'IBAZEL_BUILD_COMPLETED SUCCESS';
  // ibazel communicates with us via stdin
  const rl = createInterface({input: process.stdin, terminal: false});
  rl.on('line', (chunk: string) => {
    if (chunk === IBAZEL_NOTIFY_BUILD_SUCCESS) {
      fileList.refresh();
    }
  });
  rl.on('close', () => {
    // Give ibazel 5s to kill our process, otherwise do it ourselves
    setTimeout(() => {
      console.error('ibazel failed to stop karma after 5s; probably a bug');
      process.exit(1);
    }, 5000);
  });
}

(watcher as any).$inject = ['fileList'];

module.exports = {
  'framework:concat_js': ['factory', initConcatJs],
  'watcher': ['value', watcher],
};

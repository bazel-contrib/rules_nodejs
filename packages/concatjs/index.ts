///<amd-module name="@bazel/concatjs"/>
/*
 * Concat all JS files before serving.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as File from 'karma/lib/file';
import * as path from 'path';
import * as process from 'process';
import {createInterface} from 'readline';
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

  // Create a tmp file for the concat bundle, rely on Bazel to clean the TMPDIR
  const tmpFile =
      path.join(process.env['TEST_TMPDIR'], crypto.randomBytes(6).readUIntLE(0, 6).toString(36));

  emitter.on('file_list_modified', files => {
    const bundleFile = new File('/concatjs_bundle.js') as any;
    bundleFile.contentPath = tmpFile;
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
  // Use policy to support Trusted Types enforcement.
  var policy = null;
  if (window.trustedTypes) {
    try {
      policy = window.trustedTypes.createPolicy('bazel-karma', {
        createScript: function(s) { return s; }
      });
    } catch (e) {
      // In case the policy has been unexpectedly created before, log the error
      // and fall back to the old behavior.
      console.log(e);
    }
  }
  // IE 8 and below do not support document.head.
  var parent = document.getElementsByTagName('head')[0] ||
                    document.documentElement;
  function loadFile(path, src) {
    var trustedSrc = policy ? policy.createScript(src) : src;
    try {
      var script = document.createElement('script');
      if ('textContent' in script) {
        script.textContent = trustedSrc;
      } else {
        // This is for IE 8 and below.
        script.text = trustedSrc;
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

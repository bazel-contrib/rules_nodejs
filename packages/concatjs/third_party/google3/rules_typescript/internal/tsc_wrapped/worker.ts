import * as path from 'path';
/* tslint:disable:no-require-imports */
const protobufjs = require('protobufjs');
const ByteBuffer = require('bytebuffer');

protobufjs.convertFieldsToCamelCase = true;

export const DEBUG = false;

export function debug(...args: Array<{}>) {
  if (DEBUG) console.error.apply(console, args);
}

/**
 * Write a message to stderr, which appears in the bazel log and is visible to
 * the end user.
 */
export function log(...args: Array<{}>) {
  console.error.apply(console, args);
}

export function runAsWorker(args: string[]) {
  return args.indexOf('--persistent_worker') !== -1;
}

const workerpb = (function loadWorkerPb() {
  // This doesn't work due to a Bazel bug, see comments in build_defs.bzl
  // let protoPath =
  // 'external/bazel_tools/src/main/protobuf/worker_protocol.proto';
  const protoPath = 'build_bazel_rules_typescript/internal/worker_protocol.proto';

  // Use node module resolution so we can find the .proto file in any of the root dirs
  const protofile = require.resolve(protoPath);

  // Under Bazel, we use the version of TypeScript installed in the user's
  // workspace This means we also use their version of protobuf.js. Handle both.
  // v5 and v6 by checking which one is present.
  if (protobufjs.loadProtoFile) {
    // Protobuf.js v5
    const protoNamespace = protobufjs.loadProtoFile(protofile);
    if (!protoNamespace) {
      throw new Error('Cannot find ' + path.resolve(protoPath));
    }
    return protoNamespace.build('blaze.worker');
  } else {
    // Protobuf.js v6
    const protoNamespace = protobufjs.loadSync(protofile);
    if (!protoNamespace) {
      throw new Error('Cannot find ' + path.resolve(protoPath));
    }
    return protoNamespace.lookup('blaze.worker');
  }
})();

interface Input {
  getPath(): string;
  getDigest(): {toString(encoding: string): string};  // npm:ByteBuffer
}
interface WorkRequest {
  getArguments(): string[];
  getInputs(): Input[];
}

export function runWorkerLoop(
    runOneBuild: (args: string[], inputs?: {[path: string]: string}) =>
        boolean) {
  // Hook all output to stderr and write it to a buffer, then include
  // that buffer's in the worker protcol proto's textual output.  This
  // means you can log via console.error() and it will appear to the
  // user as expected.
  let consoleOutput = '';
  process.stderr.write =
      (chunk: string | Buffer, ...otherArgs: any[]): boolean => {
        consoleOutput += chunk.toString();
        return true;
      };

  // Accumulator for asynchronously read input.
  // tslint:disable-next-line:no-any protobufjs is untyped
  let buf: any;
  process.stdin.on('readable', () => {
    const chunk = process.stdin.read();
    if (!chunk) return;

    const wrapped = ByteBuffer.wrap(chunk);
    buf = buf ? ByteBuffer.concat([buf, wrapped]) : wrapped;
    try {
      let req: WorkRequest;
      // Read all requests that have accumulated in the buffer.
      while ((req = workerpb.WorkRequest.decodeDelimited(buf)) != null) {
        debug('=== Handling new build request');
        // Reset accumulated log output.
        consoleOutput = '';
        const args = req.getArguments();
        const inputs: {[path: string]: string} = {};
        for (const input of req.getInputs()) {
          inputs[input.getPath()] = input.getDigest().toString('hex');
        }
        debug('Compiling with:\n\t' + args.join('\n\t'));
        const exitCode = runOneBuild(args, inputs) ? 0 : 1;
        process.stdout.write(new workerpb.WorkResponse()
                                 .setExitCode(exitCode)
                                 .setOutput(consoleOutput)
                                 .encodeDelimited()
                                 .toBuffer());
        // Force a garbage collection pass.  This keeps our memory usage
        // consistent across multiple compilations, and allows the file
        // cache to use the current memory usage as a guideline for expiring
        // data.  Note: this is intentionally not within runOneBuild(), as
        // we want to gc only after all its locals have gone out of scope.
        global.gc();
      }
      // Avoid growing the buffer indefinitely.
      buf.compact();
    } catch (e) {
      log('Compilation failed', e.stack);
      process.stdout.write(new workerpb.WorkResponse()
                               .setExitCode(1)
                               .setOutput(consoleOutput)
                               .encodeDelimited()
                               .toBuffer());
      // Clear buffer so the next build won't read an incomplete request.
      buf = null;
    }
  });
}

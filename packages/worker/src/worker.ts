import "./gc";
import { readWorkRequestSize, writeWorkResponseSize } from "./size";
import { blaze } from "./worker_protocol";

/**
 * Whether to print debug messages (to console.error) from the debug function
 * below.
 */
export const DEBUG = false;

let output: string = "";

/**
 * Write a message to stderr, which appears in the bazel log and is visible to
 * the end user.
 */
export function log(...args: Array<unknown>) {
    console.error(...args);
}

/** Maybe print a debug message (depending on a flag defaulting to false). */
export function debug(...args: Array<unknown>) {
    if (DEBUG) log(...args);
}


/**
 * runAsWorker returns true if the given arguments indicate the process should
 * run as a persistent worker.
 */
export function runAsWorker(args: string[]) {
    return args.indexOf('--persistent_worker') !== -1;
}

export type Inputs = {
    // Digest is not necessarily present all the time
    // See: https://github.com/bazelbuild/rules_nodejs/issues/2953 
    // And: https://github.com/bazelbuild/bazel/blob/97643ad92d86179d21b2526e9f9804045d025f21/src/main/java/com/google/devtools/build/lib/worker/WorkerSpawnRunner.java#L238
    [path: string]: string | null;
}

export type OneBuildFunc = (
    args: string[],
    inputs: Inputs
) => boolean | Promise<boolean>;

/**
 * runWorkerLoop handles the interacton between bazel workers and the
 * any compiler. It reads compilation requests from stdin, unmarshals the
 * data, and dispatches into `runOneBuild` for the actual compilation to happen.
 *
 * The compilation handler is parameterized so that this code can be used by
 * different compiler entry points (currently TypeScript compilation, Angular
 * compilation, and the contrib vulcanize worker).
 *
 * It's also exposed publicly as an npm package:
 *   https://www.npmjs.com/package/@bazel/worker
 */
export async function runWorkerLoop(runOneBuild: OneBuildFunc) {

    process.stderr.write = (buffer: Uint8Array | string, encoding?: BufferEncoding | ((err?: Error) => void), cb?: (err?: Error) => void) => {
        output += Buffer.from(buffer).toString("utf-8");
        if (typeof encoding == "function") {
            encoding();
        } else if (typeof cb == "function") {
            cb();
        }
        return true;
    }
    // this hold the remaning data from the previous stdin loop.
    let prev: Buffer = Buffer.alloc(0);

    for await (const buffer of process.stdin) {
        let chunk: Buffer = Buffer.concat([prev, buffer]);
        let current: Buffer;

        debug("Reiterating");

        const size = readWorkRequestSize(chunk);

        if (size.size <= chunk.length + size.headerSize) {
            chunk = chunk.slice(size.headerSize)
            current = chunk.slice(0, size.size);
            prev = chunk.slice(size.size);
            debug("Now we have the full message. Time to go!");
        } else {
            prev = chunk;
            debug("We do not have the full message yet. Keep reading");
            continue;
        }

        const work = blaze.worker.WorkRequest.deserialize(current!);


        debug('Handling new build request: ' + work.request_id);

        let succedded: boolean;

        try {
            debug('Compiling with:\n\t' + work.arguments.join('\n\t'));
            succedded = await runOneBuild(
                work.arguments,
                work.inputs.reduce((inputs, input) => {
                    let digest: string | null = null;
                    if (input.digest) {
                        digest = Buffer.from(input.digest).toString("hex")
                    }
                    inputs[input.path] = digest;
                    return inputs;
                }, {} as Inputs)
            );
            debug('Compilation was successful: ' + work.request_id);
        } catch (error) {
            // will be redirected to stderr which we capture and put into output
            log('Compilation failed:\t\n', error);
            succedded = false;
        }

        const workResponse = new blaze.worker.WorkResponse({
            exit_code: succedded ? 0 : 1,
            request_id: work.request_id,
            output
        }).serialize();

        const responseSize = writeWorkResponseSize(workResponse.byteLength);

        process.stdout.write(Buffer.concat([
            responseSize,
            workResponse
        ]));

        // Force a garbage collection pass.  This keeps our memory usage
        // consistent across multiple compilations, and allows the file
        // cache to use the current memory usage as a guideline for expiring
        // data.  Note: this is intentionally not within runOneBuild(), as
        // we want to gc only after all its locals have gone out of scope.
        global.gc();
        // clear output
        output = "";
    }
}
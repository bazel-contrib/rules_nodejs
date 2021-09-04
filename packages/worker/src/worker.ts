import "./gc";
import { readMetadata, writeMetadata } from "./metadata";
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
    [path: string]: string;
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
    // this hold the remaning data from the previous stdin loop.
    let data: Buffer | undefined;
    let offset: number;


    process.stderr.write = (buffer: Uint8Array | string, encoding?: BufferEncoding | ((err?: Error) => void), cb?: (err?: Error) => void) => {
        output += Buffer.from(buffer).toString("utf-8");
        if (typeof encoding == "function") {
            encoding();
        } else if (typeof cb == "function") {
            cb();
        }
        return true;
    }

    for await (let wholeBuffer of process.stdin) {
        let chunk: Buffer = wholeBuffer;
        if (data! == undefined) {
            const metadata = readMetadata(chunk, 0);
            chunk = chunk.slice(metadata.headerSize);
            if (metadata.messageSize <= chunk.length) {
                // now we have the whole message in the buffer.
                data = chunk;
                offset = chunk.length;
            } else {
                data = Buffer.allocUnsafe(metadata.messageSize);
                offset = chunk.copy(data, 0, metadata.headerSize);
            }
        } else {
            offset! += chunk.copy(data, offset!);
        }

        if (offset! < data.length) {
            return;
        }

        const work = blaze.worker.WorkRequest.deserialize(data);

        debug('Handling new build request: ' + work.request_id);

        let succedded;

        try {
            debug('Compiling with:\n\t' + work.arguments.join('\n\t'));
            await runOneBuild(
                work.arguments,
                work.inputs.reduce((inputs, input) => {
                    inputs[input.path] = Buffer.from(input.digest).toString("hex");
                    return inputs;
                }, {} as Inputs)
            );
        } catch (error) {
            // will be redirected to stderr which we capture and put into output
            log('Compilation failed:\t\n', error);
            succedded = false;
        }

        const workResponse = new blaze.worker.WorkResponse({
            exit_code: succedded ? 1 : 0,
            request_id: work.request_id,
            output
        }).serialize();

        const metadata = writeMetadata(workResponse.byteLength);

        process.stdout.write(Buffer.concat([
            metadata,
            workResponse
        ]));

        debug('Compilation was successful: ' + work.request_id);

        // Force a garbage collection pass.  This keeps our memory usage
        // consistent across multiple compilations, and allows the file
        // cache to use the current memory usage as a guideline for expiring
        // data.  Note: this is intentionally not within runOneBuild(), as
        // we want to gc only after all its locals have gone out of scope.
        global.gc();
        // clean up the buffer for the next cycle
        data = undefined;
        // clear output
        output = "";
    }
}
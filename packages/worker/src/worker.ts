import { readMetadata, writeMetadata } from "./metadata";
import { blaze } from "./worker_protocol";
import { Writable } from "stream";

/**
 * runAsWorker returns true if the given arguments indicate the process should
 * run as a persistent worker.
 */
export function runAsWorker(args: string[]) {
    return args.indexOf('--persistent_worker') !== -1;
}


export type BuildCallack = (succedded: boolean) => void;

export type CancellationCallback = () => void;

export type Input = {
    path: string;
    digest: string;
}

export type OneBuildFunc = (
    args: string[],
    inputs: Input[],
    console: Console,
    callback: BuildCallack
) => CancellationCallback;

// keeps track of the cancellation callbacks. each callback is removed after the
// build is complete regardless of build status.
const cancellationCallbacks = new Map<number, CancellationCallback>();

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
    let data: Buffer;
    let offset: number;

    for await (let wholeBuffer of process.stdin) {
        let chunk: Buffer = wholeBuffer;
        if (data! == undefined) {
            const metadata = readMetadata(chunk, 0);
            if (metadata.messageSize <= chunk.length) {
                // now we have the whole message in the buffer.
                data = chunk.slice(metadata.headerSize, metadata.headerSize + metadata.messageSize);
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

        if (work.cancel) {
            const cancelCallback = cancellationCallbacks.get(work.request_id);
            if (cancelCallback) {
                cancellationCallbacks.delete(work.request_id);
                return cancelCallback();
            }
        }

        let output = Buffer.alloc(0);

        const stream = new Writable({
            write: (chunk) => {
                output = Buffer.concat([output, chunk]);
            }
        });

        const buildCallack: BuildCallack = (succedded) => {
            const workResponse = new blaze.worker.WorkResponse({
                exit_code: succedded ? 1 : 0,
                request_id: work.request_id,
                output: output.toString("utf-8")
            }).serialize();

            const metadata = writeMetadata(workResponse.byteLength);

            process.stdout.write(Buffer.concat([
                metadata,
                workResponse
            ]));
            cancellationCallbacks.delete(work.request_id);
        }

        const cancelCallback = runOneBuild(
            work.arguments,
            work.inputs.map(input => {
                return {
                    path: input.path,
                    digest: Buffer.from(input.digest).toString("hex")
                }
            }),
            new console.Console(stream, stream),
            buildCallack
        );

        cancellationCallbacks.set(work.request_id, cancelCallback);
    }
}
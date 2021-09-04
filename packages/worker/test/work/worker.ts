
import { runWorkerLoop, OneBuildFunc } from "@bazel/worker";
import { writeFileSync, unlinkSync } from "fs";

const compiler: OneBuildFunc = (args, inputs, console, callback) => {
    const [output] = args;

    writeFileSync(output, JSON.stringify({ args, inputs }, null, 2), { encoding: 'utf-8' });

    console.log("testt");

    callback(true);

    return () => {
        unlinkSync(output);
    };
}

runWorkerLoop(compiler);
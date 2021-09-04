
import { runWorkerLoop } from "@bazel/worker";
import { copyFileSync } from "fs";

runWorkerLoop(async (args, inputs) => {
    const [output, input] = args;
    copyFileSync(input, output);
    return true;
});
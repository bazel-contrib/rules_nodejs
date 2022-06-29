import {writeFileSync} from "fs";

const outputFile = process.argv[2];
writeFileSync(outputFile, "foobar\n");
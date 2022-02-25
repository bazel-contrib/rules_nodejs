const fs = require('fs');
const args = process.argv.slice(2);
const outfile = args[0];
const dump = {
    args,
    env: {
        OUTFILE: process.env.OUTFILE,
        COMPLATION_MODE: process.env.COMPLATION_MODE,
        TARGET_CPU: process.env.TARGET_CPU,
        BINDIR: process.env.BINDIR,
        SOME_TEST_ENV: process.env.SOME_TEST_ENV,
        SOMEARG$$: process.env.SOMEARG$$,
        SOME0ARG: process.env.SOME0ARG,
    }
}
fs.writeFileSync(outfile, JSON.stringify(dump, null, 2), 'utf-8');

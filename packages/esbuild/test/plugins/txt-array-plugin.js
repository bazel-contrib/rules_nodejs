const fs = require('fs');

module.exports = {
    name: 'txt',
    setup(build) {
        // Load ".txt" files and return an array of words
        build.onLoad({ filter: /\.txt$/ }, async (args) => {
            const text = await fs.promises.readFile(args.path, 'utf8');
            return {
                contents: JSON.stringify(text.split(/\s+/)),
                loader: 'json',
            }
        });
    },
};

module.exports = {
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "ts-loader",
                        options: {transpileOnly: true},
                    },
                ]
            }],

    },
    resolve: {
        extensions: [".tsx", ".ts", ".jsx", ".js"],
    }
};
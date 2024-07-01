const path = require('path');

module.exports = {
    entry: './index.js',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    devServer: {
        static: './dist',
        open: true,
        port: 3000
    }
};

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: {
        index: './src/index.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        clean: true,
        publicPath: '/'
    },
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
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader'
                ]
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'styles.css'
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: "manifest.json",
                    to: "manifest.json",
                    transform(content) {
                        return Buffer.from(JSON.stringify({
                            ...JSON.parse(content.toString()),
                        }))
                    }
                }
            ]
        })
    ],
    optimization: {
        splitChunks: {
            chunks: 'async',
            name: 'vendor'
        }
    }
};
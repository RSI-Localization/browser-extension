const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: {
        background: './src/background.js',
        index: './src/index.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        clean: true
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
                        // manifest.json에서 불필요한 키 제거 또는 수정
                        return Buffer.from(JSON.stringify({
                            ...JSON.parse(content.toString()),
                            // development용 키 제거
                        }))
                    }
                },
                {
                    from: "src/locales",
                    to: "locales"
                }
            ]
        })
    ],
    optimization: {
        splitChunks: {
            chunks: 'all',
            name: 'vendor'
        }
    }
};
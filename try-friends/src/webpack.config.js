const path = require('path');

const publicDir = path.normalize(__dirname + '/../dist/client');

module.exports = {
  entry: [
    './client/app.tsx',
  ],
  output: {
    filename: 'index.js',
    path: publicDir,
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'awesome-typescript-loader'
      },
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader'
      }
    ]
  },
  devServer: {
    port: 5000,
    publicPath: 'http://127.0.0.1:5000/',
    contentBase: publicDir
  }
};

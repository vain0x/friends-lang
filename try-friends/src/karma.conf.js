// Karma configuration
// Generated on Sun Mar 11 2018 19:00:32 GMT+0900 (JST)

// NOTE: Karma isn't aware of TypeScript/Vue.
//       It just watches webpack's bundles for testing.

// const webpackConfig = require('./webpack.config');
// const testingWebpackConfig = Object.assign({}, webpackConfig, { entry: undefined });

module.exports = function (config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: __dirname,

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: [
      'mocha',
      // 'karma-typescript',
    ],

    // list of files / patterns to load in the browser
    files: [
      '../dist/{client,core,server}/index.spec.js',
      // '{client,core,server}/**.ts',
    ],

    // list of files / patterns to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      // '**.spec.ts': ['webpack'],
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: [
      'mocha',
      // 'karma-typescript',
    ],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    autoWatchBatchDelay: 500,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,

    // mime: {
    //   'text/x-typescript': ['ts', 'tsx'],
    // },

    // webpack: testingWebpackConfig,
  });
};

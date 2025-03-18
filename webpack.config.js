/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('node:path');

const { DefinePlugin } = require('webpack');

const variables = {
  WEBPACK_BUILD_VERSION: JSON.stringify(process.env.BUILD_VERSION || '0.0.0'),
};

module.exports = [
  {
    mode: process.env.MODE || 'production',
    devtool: process.env.MODE ? false : 'source-map',
    entry: './libs/@cf-workers/turnstile-injection/src/index.ts',
    target: ['web', 'es3'],
    output: {
      path: path.resolve(__dirname, './dist/libs/@cf-workers/turnstile-injection/'),
      filename: 'index.js',
      library: {
        type: 'umd',
      },
      globalObject: 'this',
    },
    plugins: [new DefinePlugin(variables)],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: path.resolve(__dirname, './libs/@cf-workers/turnstile-injection/tsconfig.build.cjs.json'),
                transpileOnly: true,
              },
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.cjs', '.mjs', '.ts', '.json'],
    },
  },
  {
    mode: process.env.MODE || 'production',
    devtool: process.env.MODE ? false : 'source-map',
    entry: './libs/@cf-workers/turnstile-injection/src/index.ts',
    target: ['web', 'es2021'],
    experiments: {
      outputModule: true,
    },
    output: {
      path: path.resolve(__dirname, './dist/libs/@cf-workers/turnstile-injection/'),
      filename: 'index.mjs',
      library: {
        type: 'module',
      },
      globalObject: 'this',
    },
    plugins: [new DefinePlugin(variables)],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: path.resolve(__dirname, './libs/@cf-workers/turnstile-injection/tsconfig.build.mjs.json'),
                transpileOnly: true,
              },
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.cjs', '.mjs', '.ts', '.json'],
    },
  },
];

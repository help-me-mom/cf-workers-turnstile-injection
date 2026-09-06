/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('node:path');

const { minify_sync: minify } = require('terser');
const ts = require('typescript');
const { DefinePlugin } = require('webpack');

const frontendRoot = path.resolve(__dirname, './libs/@cf-workers/turnstile-injection');
const frontendFile = path.join(frontendRoot, 'src/frontend/index.ts');
const frontendConfig = path.join(frontendRoot, 'tsconfig.build.web.json');

const variables = {
  WEBPACK_BUILD_VERSION: JSON.stringify(process.env.BUILD_VERSION || '0.0.0'),
  WEBPACK_FRONTEND_SCRIPT: DefinePlugin.runtimeValue(() => {
    const { options, errors } = ts.getParsedCommandLineOfConfigFile(frontendConfig, {}, ts.sys);
    if (errors.length > 0) {
      throw new Error(errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
    }
    const { outputText } = ts.transpileModule(ts.sys.readFile(frontendFile), {
      fileName: frontendFile,
      compilerOptions: options,
    });
    const { code } = minify(outputText, {
      ecma: 5,
      ie8: true,
      // Field names are substituted later and may contain hyphens.
      compress: { properties: false },
      mangle: true,
      format: { ascii_only: true, comments: false },
    });
    return JSON.stringify(code);
  }, [frontendFile, frontendConfig, path.join(frontendRoot, 'tsconfig.build.cjs.json')]),
};

const createTypescriptRules = configFile => [
  {
    test: /\.tsx?$/,
    use: [
      {
        loader: 'ts-loader',
        options: {
          configFile: path.resolve(__dirname, configFile),
          transpileOnly: true,
        },
      },
    ],
  },
];

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
      rules: createTypescriptRules('./libs/@cf-workers/turnstile-injection/tsconfig.build.cjs.json'),
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
      rules: createTypescriptRules('./libs/@cf-workers/turnstile-injection/tsconfig.build.mjs.json'),
    },
    resolve: {
      extensions: ['.js', '.cjs', '.mjs', '.ts', '.json'],
    },
  },
];

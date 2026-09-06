/* eslint-disable @typescript-eslint/no-require-imports */
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const { minify_sync: minify } = require('terser');
const { DefinePlugin } = require('webpack');

const sourceRoot = path.resolve(__dirname, './libs/@cf-workers/turnstile-injection');
const buildRoot = path.resolve(__dirname, './tmp/libs/@cf-workers/turnstile-injection');
const buildConfig = path.join(sourceRoot, 'tsconfig.build.json');
const frontendFile = path.join(buildRoot, 'frontend/index.js');
const typescriptCompiler = path.join(path.dirname(require.resolve('@typescript/native/package.json')), 'bin/tsc');

const typescriptPlugin = {
  apply: compiler => {
    compiler.hooks.beforeCompile.tap('TypeScript', () => {
      const changedFiles = [...(compiler.modifiedFiles ?? []), ...(compiler.removedFiles ?? [])];
      if (!compiler.modifiedFiles || changedFiles.some(file => file.startsWith(sourceRoot + path.sep))) {
        execFileSync(process.execPath, [typescriptCompiler, '--project', buildConfig], { stdio: 'inherit' });
      }
    });
    compiler.hooks.afterCompile.tap('TypeScript', compilation => {
      compilation.contextDependencies.add(path.join(sourceRoot, 'src'));
      compilation.fileDependencies.add(buildConfig);
      compilation.fileDependencies.add(path.join(sourceRoot, 'tsconfig.json'));
    });
  },
};

const variables = {
  WEBPACK_BUILD_VERSION: JSON.stringify(process.env.BUILD_VERSION || '0.0.0'),
  WEBPACK_FRONTEND_SCRIPT: DefinePlugin.runtimeValue(() => {
    const { code } = minify(readFileSync(frontendFile, 'utf8'), {
      ecma: 2015,
      // Field names are substituted later and may contain hyphens.
      compress: { properties: false },
      mangle: true,
      format: { ascii_only: true, comments: false },
    });
    return JSON.stringify(code);
  }, [frontendFile]),
};

module.exports = [
  {
    name: 'commonjs',
    mode: process.env.MODE || 'production',
    devtool: process.env.MODE ? false : 'source-map',
    entry: path.join(buildRoot, 'index.js'),
    target: ['web', 'es2015'],
    output: {
      path: path.resolve(__dirname, './dist/libs/@cf-workers/turnstile-injection/'),
      filename: 'index.js',
      library: {
        type: 'umd',
      },
      globalObject: 'this',
    },
    plugins: [typescriptPlugin, new DefinePlugin(variables)],
    module: {
      rules: [{ test: /\.js$/, extractSourceMap: true }],
    },
  },
  {
    name: 'module',
    dependencies: ['commonjs'],
    mode: process.env.MODE || 'production',
    devtool: process.env.MODE ? false : 'source-map',
    entry: path.join(buildRoot, 'index.js'),
    target: ['web', 'es2015'],
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
      rules: [{ test: /\.js$/, extractSourceMap: true }],
    },
  },
];

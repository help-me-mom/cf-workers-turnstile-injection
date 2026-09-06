import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';

import { parse } from 'espree';

import commonjs from '../dist/libs/@cf-workers/turnstile-injection/index.js';
import esm from '../dist/libs/@cf-workers/turnstile-injection/index.mjs';

const browserSetup = `
  var window = this;
  var location = { hostname: 'api.example.com' };
  var tokenCallback;
  var renderCount = 0;
  var resetCount = 0;
  var fetchReceiver;
  var fetchBody;
  var form = {
    appendCount: 0,
    appendChild: function (input) {
      this[input.name] = input;
      this.appendCount += 1;
    }
  };
  var unmanagedForm = {};
  unmanagedForm[fieldName] = { value: 'user-managed' };
  var document = {
    forms: [form, unmanagedForm],
    createElement: function () {
      return { setAttribute: function (name, value) { this[name] = value; } };
    }
  };
  function XMLHttpRequest() {}
  XMLHttpRequest.prototype.open = function () {
    this.openArguments = arguments;
    return 'opened';
  };
  XMLHttpRequest.prototype.send = function (body) {
    this.sentBody = body;
    return 'sent';
  };
  function fetch(url, options) {
    fetchReceiver = this;
    fetchBody = options && options.body;
    return 'fetched';
  }
  var turnstile = {
    ready: function (callback) { callback(); },
    render: function (selector, options) {
      assert.equal(selector, '#cfcTest');
      assert.equal(options.sitekey, 'test-key');
      tokenCallback = options.callback;
      renderCount += 1;
      return 'widget-id';
    },
    reset: function (id) {
      assert.equal(id, 'widget-id');
      resetCount += 1;
    }
  };
  String.prototype.startsWith = undefined;
  String.prototype.endsWith = undefined;
  String.prototype.includes = undefined;
  String.prototype.replaceAll = undefined;
  Array.prototype.forEach = undefined;
  Array.prototype.includes = undefined;
  Array.from = undefined;
  URL = undefined;
  URLSearchParams = undefined;
  FormData = undefined;
  Promise = undefined;
  Symbol = undefined;
`;

const browserAssertions = `
  assert.equal(renderCount, 1);
  assert.equal(window.cftshTest, undefined);
  var xhr = new XMLHttpRequest();
  assert.equal(xhr.open('POST', 'https://api.example.com/api/nested', false, 'user', 'password'), 'opened');
  assert.equal(xhr.openArguments.length, 5);
  assert.equal(xhr.openArguments[4], 'password');
  assert.equal(xhr.send('a=1'), 'sent');
  assert.equal(xhr.sentBody, 'a=1');
  tokenCallback('first-token');
  tokenCallback('next token');
  assert.equal(form.appendCount, 1);
  assert.equal(form[fieldName].value, 'next token');
  assert.equal(form[fieldName].type, 'hidden');
  assert.equal(unmanagedForm[fieldName].value, 'user-managed');
  xhr.send('a=1');
  assert.equal(xhr.sentBody, 'a=1&' + fieldName + '=next%20token');
  xhr.send('{"message":"two  spaces"}');
  var json = JSON.parse(xhr.sentBody);
  assert.equal(json[fieldName], 'next token');
  assert.equal(json.message, 'two  spaces');
  var existing = {};
  existing[fieldName] = 'existing-token';
  xhr.send(JSON.stringify(existing));
  assert.equal(JSON.parse(xhr.sentBody)[fieldName], 'existing-token');
  var formData = {
    get: function (name) { return this[name]; },
    append: function (name, value) { this[name] = value; }
  };
  xhr.send(formData);
  assert.equal(xhr.sentBody, formData);
  assert.equal(formData[fieldName], 'next token');
  xhr.open('POST', 'https://api.example.com/other');
  xhr.send('a=1');
  assert.equal(xhr.sentBody, 'a=1');
  xhr.open('POST', 'https://unrelated.test/api');
  xhr.send('a=1');
  assert.equal(xhr.sentBody, 'a=1');
  var receiver = {};
  assert.equal(window.fetch.call(receiver, {url:'https://api.example.com/api'}, {body:'a=1'}), 'fetched');
  assert.equal(fetchReceiver, receiver);
  assert.equal(fetchBody, 'a=1&' + fieldName + '=next%20token');
  assert.ok(resetCount > 0);
`;

for (const [label, worker] of [
  ['CommonJS', commonjs.default],
  ['ES module', esm],
]) {
  for (const fieldName of ['cfr', 'cf-turnstile-response', 'field.with.dots']) {
    test(`${label}: minified ES5 frontend with ${fieldName}`, async () => {
      const response = await worker.fetch(
        new Request('https://example.com/cftsc.js'),
        {
          TURNSTILE_SITE_KEY: 'test-key',
          TURNSTILE_SECRET_KEY: 'test-secret',
          TURNSTILE_FIELD_NAME: fieldName,
          TURNSTILE_RANDOM: 'Test',
          TURNSTILE_BACKENDS: '.example.com/api',
        },
        {},
      );
      const script = await response.text();
      const ast = parse(script, { ecmaVersion: 5, sourceType: 'script', comment: true });
      assert.equal(ast.comments.length, 0);
      assert.doesNotMatch(script, /\n|\b(?:realValue|formData|result)\b|VAR_/);
      assert.match(script, /function\([a-zA-Z_$]\)/);
      assert.match(script, /\.indexOf\(/);
      assert.doesNotMatch(script, /\.(?:startsWith|endsWith)\(/);

      const browser = vm.createContext({ assert, fieldName });
      vm.runInContext(browserSetup, browser);
      vm.runInContext(script, browser);
      vm.runInContext(browserAssertions, browser);

      const legacy = vm.createContext({ assert, fieldName });
      vm.runInContext(browserSetup, legacy);
      vm.runInContext(
        'var savedTurnstile = turnstile; turnstile = undefined; fetch = undefined; JSON = undefined;',
        legacy,
      );
      vm.runInContext(script, legacy);
      vm.runInContext(
        `
          assert.equal(typeof window.cftshTest, 'function');
          turnstile = savedTurnstile;
          var onload = window.cftshTest;
          onload();
          onload();
          assert.equal(renderCount, 1);
          tokenCallback('legacy-token');
          var xhr = new XMLHttpRequest();
          xhr.open('POST', 'https://api.example.com/api');
          xhr.send('a=1');
          assert.equal(xhr.sentBody, 'a=1&' + fieldName + '=legacy-token');
          assert.equal(window.fetch, undefined);
        `,
        legacy,
      );
    });
  }
}

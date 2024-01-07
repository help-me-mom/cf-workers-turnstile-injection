declare type TurnstileCallback = (token: string) => void;

declare interface Turnstile {
  ready: (callback: () => void) => void;
  render: (
    widgetId: string,
    options: {
      sitekey: string;
      callback: TurnstileCallback;
    },
  ) => string;
  reset: (widgetId: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare interface Window {
  cftshVAR_RANDOM?: Parameters<Turnstile['ready']>[0];
}
declare interface HTMLInputElement {
  cfcVAR_RANDOM?: true;
}
declare interface XMLHttpRequest {
  mVAR_RANDOM?: string;
  uVAR_RANDOM?: string | URL;
}
declare const turnstile: undefined | Turnstile;

((c: {
  hosts: Array<string>;
  init?: true;
  location?: (u: string | URL | RequestInfo | undefined) => [string, string] | [string];
  match?: (u: string | URL | RequestInfo | undefined) => boolean;
  patch?: <T>(d: T, u: string | URL | RequestInfo | undefined) => T;
  handler?: TurnstileCallback;
  ifd?: (formData: unknown) => formData is FormData;
  d?: FormData | URLSearchParams | string;
  w?: string;
  t?: string;
  fi?: number;
  f?: HTMLFormElement;
  i?: HTMLInputElement;
}) => {
  c.ifd = (formData): formData is FormData => {
    return !!formData && typeof formData === 'object' && typeof (formData as any).append === 'function';
  };
  c.location = u => {
    const url =
      typeof u === 'string'
        ? u
        : u && typeof u === 'object' && (u as any).url
          ? (u as any).url
          : u && typeof u === 'object' && (u as any).toString
            ? (u as any).toString()
            : '';

    return ((result: Array<string>) => {
      result = url.split(':/' + '/', 2) as [string] | [string, string];
      result = (result[1] || result[0] || '').split('/');
      if (!result[0]) {
        result[0] = location.hostname;
      }
      if (result.length > 2) {
        return [result[0], result.splice(1).join('/')];
      }
      if (result.length === 1) {
        return [result[0]];
      }

      return [result[0], result[1]];
    })([]);
  };
  c.match = u => {
    if (c.hosts.length < 2 && !c.hosts[0]) {
      return true;
    }

    return ((l: { i?: number; v?: boolean; a?: [string] | [string, string]; e?: [string] | [string, string] }) => {
      l.a = c.location ? c.location(u) : [''];
      for (l.i = 0; l.i < c.hosts.length; l.i += 1) {
        l.e = c.location ? c.location(c.hosts[l.i]) : [''];

        l.v = true;
        if (
          l.v &&
          l.a &&
          l.e &&
          l.e[0] &&
          l.e[0].charAt(0) === '.' &&
          l.a[0].indexOf(l.e[0], l.a[0].length - l.e[0].length) === -1
        ) {
          l.v = false;
        }
        if (l.v && l.a && l.e && l.e[0] && l.e[0].charAt(0) !== '.' && l.a[0] !== l.e[0]) {
          l.v = false;
        }
        if (l.v && l.a && l.e && l.e[1] && (!l.a[1] || l.a[1].indexOf(l.e[1]) !== 0)) {
          l.v = false;
        }
        if (l.v) {
          return true;
        }
      }

      return false;
    })({});
  };
  c.patch = (d, u) => {
    // eslint-disable-next-line unicorn/prefer-regexp-test
    if (typeof d === 'undefined' || !c.match || !c.match(u)) {
      return d;
    }

    c.d = undefined;

    // JSON
    if (!c.d && c.t && typeof d === 'string' && typeof JSON !== 'undefined' && d.charAt(0) === '{') {
      try {
        (p => {
          if (!p['VAR_FIELD_NAME']) {
            p['VAR_FIELD_NAME'] = c.t;
            c.d = JSON.stringify(p);
          }
        })(JSON.parse(d));
      } catch {
        // nothing to do
      }
    }

    // query string
    if (!c.d && c.t && typeof d === 'string' && d.charAt(0) !== '<' && d.indexOf('=') !== -1) {
      c.d = d + '&VAR_FIELD_NAME=' + encodeURIComponent(c.t);
    }

    // FormData
    if (!c.d && c.t && c.ifd && c.ifd(d)) {
      if (!d.get('VAR_FIELD_NAME')) {
        d.append('VAR_FIELD_NAME', c.t);
      }
      c.d = d;
    }

    if (c.d && c.w && typeof turnstile === 'object') {
      turnstile.reset(c.w);
    }

    return (c.d as never) || d;
  };

  // patching XMLHttpRequest
  if (typeof XMLHttpRequest !== 'undefined') {
    ((realValue: XMLHttpRequest['send']) => {
      XMLHttpRequest.prototype.send = function (d) {
        return realValue.call(this, c.patch ? c.patch(d, this.uVAR_RANDOM) : d);
      };
    })(XMLHttpRequest.prototype.send);
    ((realValue: XMLHttpRequest['open']) => {
      XMLHttpRequest.prototype.open = function (mVAR_RANDOM, uVAR_RANDOM) {
        this.mVAR_RANDOM = mVAR_RANDOM;
        this.uVAR_RANDOM = uVAR_RANDOM;

        // eslint-disable-next-line prefer-rest-params
        return realValue.apply(this, arguments as never);
      };
    })(XMLHttpRequest.prototype.open);
  }

  // patching fetch
  if (typeof fetch !== 'undefined') {
    ((realValue: typeof fetch) => {
      window.fetch = function (u, d) {
        if (typeof d == 'object' && d.body && c.patch) {
          d.body = c.patch(d.body, u);
        }
        return realValue.apply(this, [u, d] as never);
      };
    })(window.fetch);
  }

  // implementation of turnstile
  c.handler = token => {
    c.t = token;
    if (document.forms && document.forms.length > 0) {
      for (c.fi = 0; c.fi < document.forms.length; c.fi += 1) {
        c.f = document.forms[c.fi];
        if (c.f['VAR_FIELD_NAME'] && !c.f['VAR_FIELD_NAME'].cfcVAR_RANDOM) {
          continue;
        }
        if (c.f['VAR_FIELD_NAME']) {
          c.f['VAR_FIELD_NAME'].value = token;
          continue;
        }
        if (document.createElement && c.f) {
          c.i = document.createElement('input');
          c.i.setAttribute('type', 'hidden');
          c.i.setAttribute('name', 'VAR_FIELD_NAME');
          c.i.setAttribute('value', token);
          c.i.cfcVAR_RANDOM = true;
          c.f.appendChild(c.i);
          c.i = undefined;
        }
        c.f = undefined;
      }
    }
  };

  c.init = true;
  window.cftshVAR_RANDOM = () => {
    if (c.init === undefined) {
      return;
    }
    c.init = undefined;
    if (typeof turnstile === 'object' && c.handler) {
      c.w = turnstile.render('#cfcVAR_RANDOM', {
        sitekey: 'VAR_SITE_KEY',
        callback: c.handler,
      });
      c.handler = undefined;
      window.cftshVAR_RANDOM = undefined;
    }
  };
  if (typeof turnstile === 'object') {
    turnstile.ready(window.cftshVAR_RANDOM);
  }
})({
  hosts: 'VAR_HOSTS'.split(','),
});

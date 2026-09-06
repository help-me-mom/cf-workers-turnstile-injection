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

// This hook name is shared with the injected HTML and includes its random suffix.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare interface Window {
  cftshVAR_RANDOM?: Parameters<Turnstile['ready']>[0];
}
declare interface HTMLInputElement {
  // Marks hidden inputs owned by this script.
  cfcVAR_RANDOM?: true;
}
declare interface XMLHttpRequest {
  // Keep request metadata separate for each injected script instance.
  mVAR_RANDOM?: string;
  uVAR_RANDOM?: string | URL;
}
declare const turnstile: undefined | Turnstile;

((allowedBackends: Array<string>) => {
  let currentToken: string | undefined;
  let widgetId: string | undefined;

  const isFormData = (formData: unknown): formData is FormData => {
    return !!formData && typeof formData === 'object' && typeof (formData as any).append === 'function';
  };
  const parseRequestLocation = (requestUrl: string | URL | RequestInfo | undefined): [string, string] | [string] => {
    const url =
      typeof requestUrl === 'string'
        ? requestUrl
        : requestUrl && typeof requestUrl === 'object' && (requestUrl as any).url
          ? (requestUrl as any).url
          : requestUrl && typeof requestUrl === 'object' && (requestUrl as any).toString
            ? (requestUrl as any).toString()
            : '';

    let locationParts = url.split('://', 2) as Array<string>;
    locationParts = (locationParts[1] || locationParts[0] || '').split('/');
    if (!locationParts[0]) {
      locationParts[0] = location.hostname;
    }
    if (locationParts.length > 2) {
      return [locationParts[0], locationParts.splice(1).join('/')];
    }
    if (locationParts.length === 1) {
      return [locationParts[0]];
    }

    return [locationParts[0], locationParts[1]];
  };
  const isBackendUrlMatched = (requestUrl: string | URL | RequestInfo | undefined): boolean => {
    if (allowedBackends.length < 2 && !allowedBackends[0]) {
      return true;
    }

    const requestLocation = parseRequestLocation(requestUrl);
    for (let backendIndex = 0; backendIndex < allowedBackends.length; backendIndex += 1) {
      const backendLocation = parseRequestLocation(allowedBackends[backendIndex]);

      let isMatch =
        !backendLocation[0] ||
        backendLocation[0].charAt(0) !== '.' ||
        requestLocation[0].indexOf(backendLocation[0], requestLocation[0].length - backendLocation[0].length) !== -1;
      if (
        isMatch &&
        backendLocation[0] &&
        backendLocation[0].charAt(0) !== '.' &&
        requestLocation[0] !== backendLocation[0]
      ) {
        isMatch = false;
      }
      if (
        isMatch &&
        backendLocation[1] &&
        (!requestLocation[1] || requestLocation[1].indexOf(backendLocation[1]) !== 0)
      ) {
        isMatch = false;
      }
      if (isMatch) {
        return true;
      }
    }

    return false;
  };
  const patchRequestBody = <T>(body: T, requestUrl: string | URL | RequestInfo | undefined): T => {
    if (typeof body === 'undefined' || !isBackendUrlMatched(requestUrl)) {
      return body;
    }

    let patchedBody: FormData | URLSearchParams | string | undefined;

    // JSON
    if (typeof body === 'string' && typeof JSON !== 'undefined' && currentToken && body.charAt(0) === '{') {
      try {
        (parsedBody => {
          if (parsedBody['VAR_FIELD_NAME']) {
            return;
          }
          parsedBody['VAR_FIELD_NAME'] = currentToken;
          patchedBody = JSON.stringify(parsedBody);
        })(JSON.parse(body));
      } catch {
        // nothing to do
      }
    }

    // query string
    if (
      typeof body === 'string' &&
      !patchedBody &&
      currentToken &&
      body.charAt(0) !== '<' &&
      body.indexOf('=') !== -1
    ) {
      patchedBody = body + '&VAR_FIELD_NAME=' + encodeURIComponent(currentToken);
    }

    // FormData
    if (!patchedBody && currentToken && isFormData(body)) {
      if (!body.get('VAR_FIELD_NAME')) {
        body.append('VAR_FIELD_NAME', currentToken);
      }
      patchedBody = body;
    }

    if (typeof turnstile === 'object' && patchedBody && widgetId) {
      turnstile.reset(widgetId);
    }

    return (patchedBody as never) || body;
  };

  // patching XMLHttpRequest
  if (typeof XMLHttpRequest !== 'undefined') {
    ((originalSend: XMLHttpRequest['send']) => {
      XMLHttpRequest.prototype.send = function (body) {
        return originalSend.call(this, patchRequestBody(body, this.uVAR_RANDOM));
      };
    })(XMLHttpRequest.prototype.send);
    ((originalOpen: XMLHttpRequest['open']) => {
      XMLHttpRequest.prototype.open = function (method, requestUrl) {
        this.mVAR_RANDOM = method;
        this.uVAR_RANDOM = requestUrl;

        // eslint-disable-next-line prefer-rest-params
        return originalOpen.apply(this, arguments as never);
      };
    })(XMLHttpRequest.prototype.open);
  }

  // patching fetch
  if (typeof fetch !== 'undefined') {
    ((originalFetch: typeof fetch) => {
      window.fetch = function (requestUrl, options) {
        if (typeof options == 'object' && options.body) {
          options.body = patchRequestBody(options.body, requestUrl);
        }
        return originalFetch.apply(this, [requestUrl, options] as never);
      };
    })(window.fetch);
  }

  // implementation of turnstile
  let handleToken: TurnstileCallback | undefined = token => {
    currentToken = token;
    if (document.forms && document.forms.length > 0) {
      for (let formIndex = 0; formIndex < document.forms.length; formIndex += 1) {
        const form = document.forms[formIndex];
        if (form['VAR_FIELD_NAME'] && !form['VAR_FIELD_NAME'].cfcVAR_RANDOM) {
          continue;
        }
        if (form['VAR_FIELD_NAME']) {
          form['VAR_FIELD_NAME'].value = token;
          continue;
        }
        if (form && document.createElement) {
          const hiddenInput: HTMLInputElement = document.createElement('input');
          hiddenInput.setAttribute('type', 'hidden');
          hiddenInput.setAttribute('name', 'VAR_FIELD_NAME');
          hiddenInput.setAttribute('value', token);
          hiddenInput.cfcVAR_RANDOM = true;
          form.appendChild(hiddenInput);
        }
      }
    }
  };

  let isInitializationPending: true | undefined = true;
  window.cftshVAR_RANDOM = () => {
    if (isInitializationPending === undefined) {
      return;
    }
    isInitializationPending = undefined;
    if (typeof turnstile === 'object' && handleToken) {
      widgetId = turnstile.render('#cfcVAR_RANDOM', {
        sitekey: 'VAR_SITE_KEY',
        callback: handleToken,
      });
      handleToken = undefined;
      window.cftshVAR_RANDOM = undefined;
    }
  };
  if (typeof turnstile === 'object') {
    turnstile.ready(window.cftshVAR_RANDOM);
  }
})('VAR_HOSTS'.split(','));

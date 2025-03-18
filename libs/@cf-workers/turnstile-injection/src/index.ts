/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { TurnstileBodyHandler, TurnstileHeadHandler } from './turnstile-element-handlers';
import { parseTurnstileValue, verifyTurnstileValue } from './turnstile-verification';

export interface CfWorkersTurnstileInjectionEnv {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
  //
  // Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
  // MY_QUEUE: Queue;

  TURNSTILE_SITE_KEY: string | undefined;
  TURNSTILE_SECRET_KEY: string | undefined;
  TURNSTILE_FIELD_NAME: string | undefined;
  TURNSTILE_INLINE: string | undefined;
  TURNSTILE_RANDOM: string | undefined;
  TURNSTILE_ACTION: string | undefined;
  TURNSTILE_FRONTENDS: string | undefined;
  TURNSTILE_BACKENDS: string | undefined;
}

const matchUrls = (url: string, hosts: Array<string>): boolean => {
  if (hosts.length < 2 && !hosts[0]) {
    return true;
  }

  let a = url.replace(/^https?:\/\//i, '').split('/');
  if (a.length > 2) {
    a = [a[0], a.splice(1).join('/')];
  }

  for (const host of hosts) {
    let e = host.replace(/^https?:\/\//i, '').split('/');
    if (e.length > 2) {
      e = [e[0], e.splice(1).join('/')];
    }

    let v = true;
    if (v && a && e && e[0] && e[0].charAt(0) === '.' && a[0].indexOf(e[0], a[0].length - e[0].length) === -1) {
      v = false;
    }
    if (v && a && e && e[0] && e[0].charAt(0) !== '.' && a[0] !== e[0]) {
      v = false;
    }
    if (v && a && e && e[1] && (!a[1] || a[1].indexOf(e[1]) !== 0)) {
      v = false;
    }
    if (v) {
      return true;
    }
  }

  return false;
};

export default {
  fetch: async (request: Request, env: CfWorkersTurnstileInjectionEnv, ctx: ExecutionContext): Promise<Response> => {
    const fieldName = env.TURNSTILE_FIELD_NAME || 'cfr';
    const action = env.TURNSTILE_ACTION === 'block' ? 'block' : 'header';
    const backends = (env.TURNSTILE_BACKENDS || '').split(',');

    if (!env.TURNSTILE_SITE_KEY) {
      console.error(`TURNSTILE_SITE_KEY is missing`);
    }
    if (!env.TURNSTILE_SECRET_KEY) {
      console.error(`TURNSTILE_SECRET_KEY is missing`);
    }

    const envTurnstileInline = env.TURNSTILE_INLINE !== 'no';
    const nonce = crypto.randomUUID();
    const headHandler = new TurnstileHeadHandler(env.TURNSTILE_RANDOM ?? '');
    const turnstileHandler = new TurnstileBodyHandler(
      env.TURNSTILE_SITE_KEY,
      fieldName,
      envTurnstileInline ? nonce : undefined,
      env.TURNSTILE_RANDOM ?? '',
      env.TURNSTILE_BACKENDS ?? '',
    );

    const url = new URL(request.url);
    if (url.pathname === '/cftsc.js') {
      return new Response(turnstileHandler.script(), {
        headers: {
          'Content-Type': 'application/javascript; charset=UTF-8',
          'Cache-Control': `public, max-age=${60 * 60 * 24 * 365}`,
        },
      });
    }

    const originRequest = new Request(request.clone() as RequestInfo);

    // removing system headers
    originRequest.headers.delete('X-Turnstile-Success');
    originRequest.headers.delete('X-Turnstile-Time');

    // verifying turnstile
    if (
      (request.method === 'PUT' || request.method === 'POST') &&
      fieldName &&
      env.TURNSTILE_SECRET_KEY &&
      matchUrls(request.url, backends)
    ) {
      try {
        const outcome = await verifyTurnstileValue(
          env.TURNSTILE_SECRET_KEY,
          await parseTurnstileValue(request, fieldName),
          request.headers.get('CF-Connecting-IP') ?? '',
          '',
          env.TURNSTILE_FRONTENDS,
        );
        originRequest.headers.set('X-Turnstile-Data', JSON.stringify(outcome));
        if (outcome && outcome.success) {
          originRequest.headers.set('X-Turnstile-Success', 'yes');
          originRequest.headers.set(
            'X-Turnstile-Time',
            `${Math.floor((Date.now() - Date.parse(outcome.challenge_ts)) / 1e3)}`,
          );
        } else {
          originRequest.headers.set('X-Turnstile-Success', 'no');
        }
      } catch (error) {
        console.error('Turnstile verification error', error);
      }
    }

    if (originRequest.url === 'http://localhost/') {
      const headers: Record<string, string> = {};
      if (originRequest.headers.has('X-Turnstile-Success')) {
        headers['X-Turnstile-Success'] = originRequest.headers.get('X-Turnstile-Success') ?? '';
      }
      if (originRequest.headers.has('X-Turnstile-Time')) {
        headers['X-Turnstile-Time'] = originRequest.headers.get('X-Turnstile-Time') ?? '';
      }
      return new Response(null, {
        headers,
      });
    }
    if (originRequest.headers.get('X-Turnstile-Success') === 'no' && action === 'block') {
      return new Response('Forbidden', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain; charset=UTF-8',
          'Cache-Control': `private, no-cache, no-store`,
        },
      });
    }

    ctx.waitUntil(Promise.resolve());

    const responseOriginal = await fetch(originRequest as RequestInfo);
    const response = new Response(responseOriginal.body, responseOriginal);
    if (response.headers.has('content-security-policy')) {
      const csp: Array<string> = [];
      const cspMap: Record<string, string> = {};
      for (const option of (response.headers.get('content-security-policy') ?? '').split(/[,;]\s*/)) {
        if (option.trim().length === 0) {
          continue;
        }
        const [directive, ...rest] = option.trim().split(' ');
        const value = rest.join(' ');
        if (cspMap[directive] === undefined) {
          csp.push(directive);
        }
        cspMap[directive] = (cspMap[directive] ?? '').concat(' ', (value ?? '').trim()).trim();
      }
      {
        let scriptSrc = cspMap['script-src'] ?? cspMap['default-src'] ?? '';
        if (!scriptSrc.includes('https://challenges.cloudflare.com')) {
          scriptSrc = scriptSrc.concat(' https://challenges.cloudflare.com').trim();
          if (cspMap['script-src'] === undefined) {
            csp.push('script-src');
          }
          cspMap['script-src'] = scriptSrc;
        }
      }
      {
        let frameSrc = cspMap['frame-src'] ?? cspMap['default-src'] ?? '';
        if (!frameSrc.includes('https://challenges.cloudflare.com')) {
          frameSrc = frameSrc.concat(' https://challenges.cloudflare.com').trim();
          if (cspMap['frame-src'] === undefined) {
            csp.push('frame-src');
          }
          cspMap['frame-src'] = frameSrc;
        }
      }
      {
        let connectSrc = cspMap['connect-src'] ?? cspMap['default-src'] ?? '';
        if (!connectSrc.includes(`'self'`)) {
          connectSrc = connectSrc.concat(` 'self'`).trim();
          if (cspMap['connect-src'] === undefined) {
            csp.push('connect-src');
          }
          cspMap['connect-src'] = connectSrc;
        }
      }
      {
        if (envTurnstileInline && !(cspMap['script-src'] ?? '').includes(`'nonce-${nonce}'`)) {
          const scriptSrc = (cspMap['script-src'] ?? cspMap['default-src'] ?? '').concat(` 'nonce-${nonce}'`).trim();
          if (cspMap['script-src'] === undefined) {
            csp.push('script-src');
          }
          cspMap['script-src'] = scriptSrc;
        }
      }
      {
        if (!envTurnstileInline && !(cspMap['script-src'] ?? cspMap['default-src'] ?? '').includes(`'self'`)) {
          const scriptSrc = (cspMap['script-src'] ?? cspMap['default-src'] ?? '').concat(` 'self'`).trim();
          if (cspMap['script-src'] === undefined) {
            csp.push('script-src');
          }
          cspMap['script-src'] = scriptSrc;
        }
      }

      for (let cspIndex = 0; cspIndex < csp.length; cspIndex += 1) {
        const directive = csp[cspIndex];
        csp[cspIndex] = `${directive} ${cspMap[directive]}`;
      }
      response.headers.set('Content-Security-Policy', csp.join('; '));
    }
    if (
      fieldName &&
      env.TURNSTILE_SITE_KEY &&
      response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() === 'text/html'
    ) {
      return new HTMLRewriter().on('head', headHandler).on('body', turnstileHandler).transform(response);
    }
    return response;
  },
};

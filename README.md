# CF Workers - Turnstile Injection

This library injects invisible [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
on any website behind [Cloudflare](http://cloudflare.com/)
without a need to change the source code of the website, form, api, etc.

The library provides a simple [Workers script](https://workers.cloudflare.com)
which not only validates Turnstile resolves, but also injects javascript on html pages and attaches Turnstile responses
to forms, api requests (via `XMLHttpRequest` / `fetch`) without extra coding.

By default, the library will add 2 headers to your origin:

- `X-Turnstile-Success` can be `yes` or `no`, and represents whether Turnstile has been solved successfully
- `X-Turnstile-Time` is a number of seconds since Turnstile has been solved

Or, you can set [`TURNSTILE_ACTION`](#turnstile_action) to `block`
to return `403` on `POST` and `PUT` requests which have not solved Turnstile successfully.
This approach protects your forms and APIs from abuse.

## How to use Turnstile Injection

There are 2 ways how you can use the library:

- create a workers application [via CF dashboard](#cf-dashboard) based on the source code of the library
- use the library [as a dependency](#wrangler-project) of a [`wrangler`](https://developers.cloudflare.com/workers/wrangler/) project

### CF Dashboard

Go to your Cloudflare account > Workers & Pages > Create application > Create Worker.  
Name can be "turnstile", or whatever you prefer.  
"Code preview" doesn't matter, click "Deploy".

After the deployment, click "Edit code", and replace the whole script with this library:

- Download the latest release of the library: https://github.com/help-me-mom/cf-workers-turnstile-injection/releases
- Unpack it and drag and drop `package/index.mjs` (not `.js`)
  into the browser window with the source code of the worker,
- you will get a new tab with the source code of the library and a strange name like `var t=.. index.mjs`
- do the right-click on the tab and choose "Close"
- it will ask whether you want to save the file, click "Save"
- choose `worker.js` as the name and click "OK"
- on the right hand side at the top, click "Save and deploy"
- Profit, now you can [configure it](#configuration)

### Wrangler project

In your existing or [new wrangler project](https://developers.cloudflare.com/workers/get-started/guide/#1-create-a-new-worker-project),
you need to install the library as a dependency:

```shell
npm install @cf-workers/turnstile-injection --save
```

Then in your `index.js` or `index.ts` you need to import the library:

```ts
import cfTurnstileInjection from '@cf-workers/turnstile-injection';
// should be removed in js files
import type { CfWorkersTurnstileInjectionEnv } from '@cf-workers/turnstile-injection';
```

if you have `interface Env`, it should extend `CfWorkersTurnstileInjectionEnv`:

```ts
interface Env
  extends CfWorkersTurnstileInjectionEnv {
  // ...
}
```

The last step is to update the `fetch` handler to process requests via `cfTurnstileInjection`:

```ts
export default {
  fetch: async (
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> => {
    // add this line
    return cfTurnstileInjection.fetch(
      request,
      env,
      ctx,
    );
  },
};
```

Profit, now you can deploy and [configure it](#configuration).

## Configuration

First of all, you should have `Site Key` and `Secret Key` of an invisible Turnstile widget.

### Turnstile widget

If you do not have, you can create one in your Cloudflare Account > Turnstile > Add Site.

- "Site name" can be the domain name of your website
- "Domain" should include all domain names where you plan to use this widget (only frontends)
- "Widget Mode" has to be "Invisible"
- "pre-clearance" can stay "No"
- click "Create"
- Profit, now you should see `Site Key` and `Secret Key`

### Workers Environment Variables

The configuration of the library is done via Environment Variables.

There are only 2 of them are required: [`TURNSTILE_SITE_KEY`](#turnstile_site_key) and [`TURNSTILE_SECRET_KEY`](#turnstile_secret_key).

#### TURNSTILE_SITE_KEY

Required: yes

`Site Key` of your Turnstile widget.

#### TURNSTILE_SECRET_KEY

Required: yes

`Secret Key` of your Turnstile widget.

#### TURNSTILE_FIELD_NAME

Required: no

By default, the library is using `cfr` as a field name in forms and requests.
In case, if `cfr` is used on your website already, you can change it to any other value.

#### TURNSTILE_INLINE

Required: no

By default, the library loads a frontend script via `/cftsc.js` on the same domain name.
It's done for CSP (Content Security Policy), but if you want, you can set this variable to `yes`
to inline the frontend script.

#### TURNSTILE_RANDOM

Required: no

In very rare cases, you might want to add a random suffix to HTML elements this library is creating and using.
For that, you can set a random value in this variable, for example, `123`.

#### TURNSTILE_ACTION

Required: no

By default, the library adds `X-Turnstile-Success` and `X-Turnstile-Time` headers to your origin.
So, it doesn't block requests if they have not solved Turnstile.
This allows you to verify whether the library was installed and configured correctly.

Once, you are certain it works correctly, you can change its value to `block`.
In this case, the library will return `403` in `POST` and `PUT` requests which failed on Turnstile.

#### TURNSTILE_FRONTENDS

Required: no (but very recommended)

Possible value: <domain1.name>,<.any-sub-domain2.name>,<etc>

By default, the library accepts Turnstile from any frontend.
It means, anyone can send you a Turnstile response even it doesn't belong to your websites.

To solve this, you can provide here a list of domains which should be accepted.

For example, if your frontend application is on `example.com` and `www.example.com`,
the value should be `example.com,www.example.com`.

If you want to accept any subdomain, simply start the domain name with a dot:
`example.com,.example.com`.
That means `example.com`, `www.example.com` or `whatever.example.com` is valid.

#### TURNSTILE_BACKENDS

Required: no (but very recommended)

Possible value: <domain1.name>,<.any-sub-domain2.name>,<domain3.name/allowed-prefix>,<etc>

By default, the library adds Turnstile responses to all forms and API requests.
Also, it tries to validate Turnstile responses on all `POST` and `PUT` requests.

However, you might want to protect only particular endpoints, for example, `/api/login` only,
whereas, requests to `/api/logout` should not validate Turnstile.

For that, you need to set this variable with a list of desired endpoints and/or domains:
`api.example.com,.example.com/api/login`.
That means any request to `api.example.com`
or a request to any subdomain where path starts with `/api/login` should be validated.

### Workers Triggers

When everything is set:

- a workers application has been deployed
- a Turnstile widget has been created
- Environment Variables have been configured

It's time to set triggers of the workers application
to inject Turnstile into frontend code and
to validate Turnstile responses on `POST` and `PUT` requests.

To do so, you need to go to your Cloudflare account > Workers & Pages > Your Turnstile Application > Triggers > Routes.

Here you need to add routes for frontends and backends hostnames and/or paths.

For example, if your frontend and backend are on `example.com`:

- click "Add route" to add a route
- "Route" should be `example.com/*`
- "Zone" should be `example.com`
- click "Add route" to save it

Another example, if your frontend is on `www.example.com` and your backend is on `api.example.com`:

- click "Add route" to add a route
- "Route" should be `www.example.com/*`
- "Zone" should be `example.com`
- click "Add route" to save it
- click "Add route" to add a route
- "Route" should be api.example.com/\*`
- "Zone" should be `example.com`
- click "Add route" to save it

Routes can cover wider routes than
[`TURNSTILE_FRONTENDS`](#turnstile_frontends) and [`TURNSTILE_BACKENDS`](#turnstile_backends) accept,
that's fine.

## Help

Feel free to [start a discussion on GitHub](https://github.com/help-me-mom/cf-workers-turnstile-injection/discussions)
with any question or proposal.

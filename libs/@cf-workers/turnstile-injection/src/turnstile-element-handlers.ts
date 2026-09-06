declare const WEBPACK_BUILD_VERSION: string;
declare const WEBPACK_FRONTEND_SCRIPT: string;

export class TurnstileHeadHandler implements HTMLRewriterElementContentHandlers {
  private processed = false;

  constructor(public readonly random: string) {}

  element(element: Element) {
    if (this.processed) {
      return;
    }
    this.processed = true;

    element.append(
      `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=cftsh${this.random}" defer></script>`,
      {
        html: true,
      },
    );
  }
}

export class TurnstileBodyHandler implements HTMLRewriterElementContentHandlers {
  private processed = false;

  constructor(
    public readonly siteKey: string | undefined,
    public readonly fieldName = 'cfr',
    public readonly inlineNonce: string | undefined = undefined,
    public readonly random: string,
    public readonly hosts: string,
  ) {}

  script(): string {
    return WEBPACK_FRONTEND_SCRIPT.replaceAll(/VAR_(HOSTS|RANDOM|FIELD_NAME|SITE_KEY)/gm, value => {
      switch (value) {
        case 'VAR_HOSTS': {
          return this.hosts ?? '';
        }
        case 'VAR_RANDOM': {
          return this.random ?? '';
        }
        case 'VAR_FIELD_NAME': {
          return this.fieldName ?? '';
        }
        case 'VAR_SITE_KEY': {
          return this.siteKey ?? '';
        }
        default: {
          return value;
        }
      }
    });
  }

  async element(element: Element) {
    if (!this.siteKey) {
      return;
    }
    if (this.processed) {
      return;
    }
    this.processed = true;

    element.append(
      `
				<script type="application/javascript"${this.inlineNonce ? ` nonce="${this.inlineNonce}"` : ` async src="/cftsc.js?v=${WEBPACK_BUILD_VERSION}"`}>${
          this.inlineNonce ? this.script() : ''
        }</script>
				<div id="cfc${this.random}"></div>
			`
        .trim()
        .split(/\r?\n+/)
        .map(line => line.trim())
        .join(' '),
      {
        html: true,
      },
    );
  }
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import frontendTsScript from '!!raw-loader!ts-loader?configFile=tsconfig.build.web.json!./frontend';

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
    public readonly inline = false,
    public readonly random: string,
    public readonly hosts: string,
  ) {}

  // eslint-disable-next-line max-lines-per-function
  script(): string {
    return (frontendTsScript as string)
      .replaceAll(/VAR_(HOSTS|RANDOM|FIELD_NAME|SITE_KEY)/gm, value => {
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
      })
      .split(/\r?\n+/)
      .map(line => line.trim())
      .filter(line => !line.startsWith('//') && !line.startsWith('#') && line.length > 0)
      .join(' ')
      .replace(/\s+/gm, ' ');
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
				<script type="application/javascript"${this.inline ? '' : ' async src="/cftsc.js?v=0.0.0"'}>${
          this.inline ? this.script() : ''
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

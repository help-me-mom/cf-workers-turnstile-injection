export type TurnstileVerification =
  | {
      success: true;
      'error-codes': Array<string>; // 'timeout-or-duplicate'
      challenge_ts: string; // "2023-12-26T11:50:50.383Z"
      hostname: string;
      action: string;
      cdata: string;
      metadata: {
        interactive?: true;
      };
    }
  | {
      success: false;
      'error-codes': Array<string>; // 'timeout-or-duplicate'
      messages: Array<string>;
    }
  | undefined;

/**
 * Extracts Turnstile token from request
 */
export const parseTurnstileValue = async (request: Request, fieldName: string): Promise<string> => {
  let cfTurnstileResponse = '';
  try {
    if (!cfTurnstileResponse) {
      const formData = await request.clone().formData();
      const value = formData.get(fieldName);
      console.error('Value from FormData', value);
      if (typeof value === 'string') {
        cfTurnstileResponse = value;
      }
    }
  } catch (error) {
    console.error('Error parsing FormData', error);
  }
  try {
    if (!cfTurnstileResponse) {
      const json = await request.clone().json<Record<string, unknown>>();
      const value = json[fieldName];
      console.error('Value from JSON', value);
      if (typeof value === 'string') {
        cfTurnstileResponse = value;
      }
    }
  } catch (error) {
    console.error('Error parsing JSON', error);
  }
  console.error('cfTurnstileResponse', cfTurnstileResponse);

  return cfTurnstileResponse;
};

const validateHost = (hostname: undefined | string, hosts: string): boolean => {
  if (!hosts) {
    return false;
  }
  if (!hostname) {
    return true;
  }

  for (const host of hosts.split(',')) {
    if (hostname === host) {
      return true;
    }
    if (host.charAt(0) === '.' && hostname.endsWith(host)) {
      return true;
    }
  }

  return false;
};

export const verifyTurnstileValue = async (
  secretKey: string,
  token: string,
  remoteIp: string,
  idempotencyKey: string,
  hosts = '',
): Promise<TurnstileVerification> => {
  if (!token || !secretKey) {
    return undefined;
  }

  const formData = new FormData();
  formData.append('secret', secretKey);
  formData.append('response', token);
  formData.append('remoteip', remoteIp);
  if (idempotencyKey) {
    formData.append('idempotency_key', idempotencyKey);
  }
  try {
    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      body: formData,
      method: 'POST',
    });

    const data = await result.json<TurnstileVerification>();
    if (data && data.success) {
      return validateHost(data.hostname, hosts)
        ? data
        : {
            success: false,
            'error-codes': ['bad-request'],
            messages: ['wrong-hostname'],
          };
    }

    return data;
  } catch {
    return undefined;
  }
};

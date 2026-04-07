interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  return undefined;
}

export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === "undefined") return;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options.maxAge) {
    cookieString += `; Max-Age=${options.maxAge}`;
  }

  if (options.expires) {
    cookieString += `; Expires=${options.expires.toUTCString()}`;
  }

  if (options.path) {
    cookieString += `; Path=${options.path}`;
  } else {
    cookieString += "; Path=/";
  }

  if (options.domain) {
    cookieString += `; Domain=${options.domain}`;
  }

  if (options.secure) {
    cookieString += "; Secure";
  }

  if (options.sameSite) {
    cookieString += `; SameSite=${options.sameSite}`;
  } else {
    cookieString += "; SameSite=lax";
  }

  document.cookie = cookieString;
}

export function deleteCookie(
  name: string,
  options: Pick<CookieOptions, "path" | "domain"> = {}
): void {
  setCookie(name, "", {
    ...options,
    maxAge: -1,
    expires: new Date(0)
  });
}

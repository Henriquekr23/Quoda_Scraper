export class CookieJar {
  private cookies: Map<string, string> = new Map();

  addCookies(setCookieHeader: string | string[] | null) {
    if (!setCookieHeader) return;
    
    const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    
    for (const header of headers) {
      // Split cookies which might be separated by commas (in unified headers)
      // but watch out for expiration dates containing commas.
      // E.g. "cookie_name=val; expires=Mon, 08-Jun-2026..."
      const parts = header.split(/,(?=[^;]*=)/);
      for (const part of parts) {
        const cookiePart = part.trim().split(';')[0];
        const eqIdx = cookiePart.indexOf('=');
        if (eqIdx > -1) {
          const name = cookiePart.substring(0, eqIdx).trim();
          const value = cookiePart.substring(eqIdx + 1).trim();
          if (name) {
            this.cookies.set(name, value);
          }
        }
      }
    }
  }

  getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  clear() {
    this.cookies.clear();
  }
}

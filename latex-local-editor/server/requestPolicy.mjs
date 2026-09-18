export function requestAllowed(req, allowedHosts) {
  if (!allowedHosts.has(req.headers.host)) return false;
  const origin = req.headers.origin;
  if (origin) {
    try {
      const url = new URL(origin);
      if (url.protocol !== "http:" || !allowedHosts.has(url.host)) return false;
    } catch { return false; }
  }
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  return true;
}

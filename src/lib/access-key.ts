/** Slug oder voller Token aus `/l/<segment>` oder `?token=`. */
export function accessKeyFromPath(pathname: string): string | null {
  const match = /^\/l\/([^/]+)/.exec(pathname);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function buildHilfeHref(accessKey: string | null, hash?: string): string {
  const base = accessKey
    ? `/hilfe?token=${encodeURIComponent(accessKey)}`
    : "/hilfe";
  return hash ? `${base}${hash}` : base;
}

export function buildTrackingHref(accessKey: string): string {
  return `/l/${encodeURIComponent(accessKey)}`;
}

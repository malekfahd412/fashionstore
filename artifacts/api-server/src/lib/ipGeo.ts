function isPrivateIp(ip: string): boolean {
  return /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|localhost$|unknown$|admin-unlock$)/.test(ip);
}

export async function getIpLocation(ip: string): Promise<string> {
  if (!ip || isPrivateIp(ip)) return "";
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,regionName`, {
      signal: controller.signal,
    });
    clearTimeout(tid);
    if (!res.ok) return "";
    const data = await res.json() as { status: string; country?: string; city?: string; regionName?: string };
    if (data.status !== "success") return "";
    const parts = [data.city, data.regionName, data.country].filter(Boolean);
    return parts.join(", ");
  } catch {
    return "";
  }
}

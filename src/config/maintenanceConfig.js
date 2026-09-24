/**
 * SAMYAK 2026 - Cloudflare Free Plan Remote Maintenance & Killswitch
 * 
 * Free-tier control options:
 * 1. Cloudflare Dashboard: Toggle VITE_MAINTENANCE_MODE = true / false under Settings -> Variables
 * 2. Remote Worker (Optional): Provide VITE_GATEWAY_URL if a dedicated worker is deployed
 */

export const CLOUDFLARE_GATEWAY_URL = 
  import.meta.env.VITE_GATEWAY_URL || null;

// Default build-time setting (configured via Cloudflare environment variable)
export const IS_MAINTENANCE_MODE = 
  String(import.meta.env.VITE_MAINTENANCE_MODE || '').trim().toLowerCase() === 'true' ||
  import.meta.env.VITE_MAINTENANCE_MODE === '1' ||
  import.meta.env.VITE_MAINTENANCE_MODE === true;

/**
 * Checks Cloudflare Edge status if a gateway URL is configured.
 */
export async function fetchEdgeStatus() {
  if (!CLOUDFLARE_GATEWAY_URL) {
    return { isLocked: IS_MAINTENANCE_MODE, source: 'environment_config' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(CLOUDFLARE_GATEWAY_URL, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { isLocked: IS_MAINTENANCE_MODE, source: 'edge_fallback' };
    }

    const data = await res.json();
    return {
      isLocked: !data.operational,
      reason: data.reason || "System Under Core Maintenance",
      source: 'cloudflare_edge'
    };
  } catch {
    return { isLocked: IS_MAINTENANCE_MODE, source: 'local_fallback' };
  }
}

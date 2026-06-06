/**
 * IP-based session binding for enhanced security
 * Binds sessions to IP addresses to prevent token theft replay
 */

export type IPBindingStrictness = 'exact' | 'subnet' | 'disabled';

export interface IPBindingResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate IP binding between session IP and request IP
 * @param sessionIP - IP address stored with the session
 * @param requestIP - IP address from the current request
 * @param strictness - Level of IP binding strictness
 * @returns Validation result with reason if invalid
 */
export function validateIPBinding(
  sessionIP: string | undefined,
  requestIP: string | undefined,
  strictness: IPBindingStrictness = 'subnet'
): IPBindingResult {
  // If IP binding is disabled, always valid
  if (strictness === 'disabled') {
    return { valid: true };
  }

  // If session has no IP stored, allow binding (first request)
  if (!sessionIP) {
    return { valid: true };
  }

  // If request has no IP, reject (security measure)
  if (!requestIP) {
    return { valid: false, reason: 'Request IP missing' };
  }

  // Exact IP matching
  if (strictness === 'exact') {
    if (sessionIP === requestIP) {
      return { valid: true };
    }
    return { valid: false, reason: 'IP address mismatch' };
  }

  // Subnet matching (IPv4 only for simplicity)
  if (strictness === 'subnet') {
    const subnetMatch = matchIPv4Subnet(sessionIP, requestIP);
    if (subnetMatch) {
      return { valid: true };
    }
    return { valid: false, reason: 'IP subnet mismatch' };
  }

  // Default to valid for unknown strictness
  return { valid: true };
}

/**
 * Match two IPv4 addresses by /24 subnet
 * @param ip1 - First IP address
 * @param ip2 - Second IP address
 * @returns True if IPs are in the same /24 subnet
 */
function matchIPv4Subnet(ip1: string, ip2: string): boolean {
  const subnet1 = getIPv4Subnet(ip1);
  const subnet2 = getIPv4Subnet(ip2);

  if (!subnet1 || !subnet2) {
    // If either IP is not IPv4, fall back to exact match
    return ip1 === ip2;
  }

  return subnet1 === subnet2;
}

/**
 * Get the /24 subnet of an IPv4 address
 * @param ip - IPv4 address
 * @returns Subnet (first three octets) or null if not IPv4
 */
function getIPv4Subnet(ip: string): string | null {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return null; // Not IPv4
  }

  // Validate each part is a number 0-255
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) {
      return null; // Not valid IPv4
    }
  }

  // Return first three octets as subnet
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

/**
 * Extract client IP from request headers
 * Prioritizes Cloudflare cf-connecting-ip header
 * @param headers - Request headers (simple getter interface or full Headers)
 * @returns Client IP address or undefined
 */
export function extractClientIP(headers: { get(name: string): string | null } | Headers): string | undefined {
  // Check Cloudflare connecting IP header first
  const cfIP = headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }

  // Fallback to X-Forwarded-For
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const firstIP = xff.split(',')[0];
    return firstIP ? firstIP.trim() : undefined;
  }

  // Fallback to X-Real-IP
  const xRealIP = headers.get('x-real-ip');
  if (xRealIP) {
    return xRealIP;
  }

  return undefined;
}

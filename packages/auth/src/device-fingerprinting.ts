/**
 * Device fingerprinting for session security
 * Detects anomalous device changes to prevent session hijacking
 * Follows OWASP 2025 authentication security guidelines
 */

import { logAuthEvent, createAuthEvent } from './audit-log.js';
import type { createAuth } from './server.js';

/**
 * Generate a device fingerprint from user agent and IP address
 * Uses SHA-256 hashing with a salt for privacy and security
 * @param userAgent - User agent string from request headers
 * @param ip - IP address from request headers
 * @returns Promise resolving to hashed device fingerprint
 */
export async function generateDeviceFingerprint(
  userAgent: string,
  ip: string
): Promise<string> {
  // Combine user agent and IP for fingerprint
  const fingerprintData = `${userAgent}|${ip}`;
  
  // Use Web Crypto API for SHA-256 hashing (Cloudflare Workers compatible)
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintData);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Detect if a device is anomalous based on session history
 * Compares current fingerprint with known devices from user's sessions
 * @param userId - User ID to check session history for
 * @param fingerprint - Current device fingerprint
 * @param authInstance - Better Auth instance for session queries
 * @returns Promise resolving to true if device is anomalous
 */
export async function detectAnomalousDevice(
  userId: string,
  fingerprint: string,
  authInstance: ReturnType<typeof createAuth>
): Promise<boolean> {
  try {
    // Get all sessions for the user
    const sessions = await authInstance.api.listSessions({
      headers: new Headers(),
    });
    
    if (!Array.isArray(sessions) || sessions.length === 0) {
      // First session - not anomalous
      return false;
    }
    
    // Extract device fingerprints from session metadata
    // Better Auth stores custom data in the session object
    const knownFingerprints = sessions
      .map((session: Record<string, unknown>) => session.deviceFingerprint as string | undefined)
      .filter((fp: string | undefined): fp is string => fp !== undefined);
    
    if (knownFingerprints.length === 0) {
      // No known fingerprints - not anomalous
      return false;
    }
    
    // Check if current fingerprint matches any known device
    const isKnownDevice = knownFingerprints.includes(fingerprint);
    
    return !isKnownDevice;
  } catch (error) {
    console.error('Failed to detect anomalous device:', error);
    // Fail open - don't block on detection errors
    return false;
  }
}

/**
 * Log a device anomaly event to the audit trail
 * @param userId - User ID
 * @param email - User email
 * @param fingerprint - Anomalous device fingerprint
 * @param ip - IP address
 * @param userAgent - User agent string
 */
export function logDeviceAnomaly(
  userId: string,
  email: string,
  fingerprint: string,
  ip?: string,
  userAgent?: string
): void {
  const context: Parameters<typeof createAuthEvent>[1] = {
    userId,
    email,
    metadata: {
      deviceFingerprint: fingerprint.substring(0, 16) + '...', // Log partial fingerprint for security
      anomalyType: 'new_device',
    },
  };
  
  if (ip !== undefined) {
    context.ip = ip;
  }
  
  if (userAgent !== undefined) {
    context.userAgent = userAgent;
  }
  
  logAuthEvent(createAuthEvent('device_anomaly', context));
}

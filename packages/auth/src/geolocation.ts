/**
 * Geolocation-based anomaly detection for session security
 * Detects anomalous login locations to prevent session hijacking
 * Uses Cloudflare Workers native geolocation data (request.cf)
 * Follows OWASP 2025 authentication security guidelines
 */

import { logAuthEvent, createAuthEvent } from './audit-log.js';
import type { createAuth } from './server.js';

/**
 * Geolocation data extracted from Cloudflare request.cf object
 */
export interface GeolocationData {
  country?: string;
  city?: string;
  continent?: string;
  region?: string;
  regionCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

/**
 * Extract geolocation data from Cloudflare request.cf object
 * In Cloudflare Workers, geolocation data is available via request.cf
 * @param cf - Cloudflare request.cf object
 * @returns Geolocation data
 */
export function extractGeolocationFromCF(cf: Partial<GeolocationData>): GeolocationData {
  const location: GeolocationData = {};
  
  if (cf.country !== undefined) location.country = cf.country;
  if (cf.city !== undefined) location.city = cf.city;
  if (cf.continent !== undefined) location.continent = cf.continent;
  if (cf.region !== undefined) location.region = cf.region;
  if (cf.regionCode !== undefined) location.regionCode = cf.regionCode;
  if (cf.latitude !== undefined) location.latitude = cf.latitude;
  if (cf.longitude !== undefined) location.longitude = cf.longitude;
  if (cf.timezone !== undefined) location.timezone = cf.timezone;
  
  return location;
}

/**
 * Detect if a login location is anomalous based on session history
 * Compares current location with known locations from user's sessions
 * @param userId - User ID to check session history for
 * @param location - Current geolocation data
 * @param authInstance - Better Auth instance for session queries
 * @returns Promise resolving to true if location is anomalous
 */
export async function detectLocationAnomaly(
  userId: string,
  location: GeolocationData,
  authInstance: ReturnType<typeof createAuth>
): Promise<boolean> {
  try {
    // If no country data available, cannot detect anomaly
    if (!location.country) {
      return false;
    }

    // Get all sessions for the user
    const sessions = await authInstance.api.listSessions({
      headers: new Headers(),
    });

    if (!Array.isArray(sessions) || sessions.length === 0) {
      // First session - not anomalous
      return false;
    }

    // Extract country codes from session metadata
    // Better Auth stores custom data in the session object
    const knownCountries = sessions
      .map((session: Record<string, unknown>) => {
        const sessionLocation = session.location as GeolocationData | undefined;
        return sessionLocation?.country;
      })
      .filter((country: string | undefined): country is string => country !== undefined);

    if (knownCountries.length === 0) {
      // No known locations - not anomalous
      return false;
    }

    // Check if current country matches any known location
    const isKnownLocation = knownCountries.includes(location.country);

    return !isKnownLocation;
  } catch (error) {
    console.error('Failed to detect location anomaly:', error);
    // Fail open - don't block on detection errors
    return false;
  }
}

/**
 * Log a location anomaly event to the audit trail
 * @param userId - User ID
 * @param email - User email
 * @param location - Anomalous geolocation data
 * @param ip - IP address
 * @param userAgent - User agent string
 */
export function logLocationAnomaly(
  userId: string,
  email: string,
  location: GeolocationData,
  ip?: string,
  userAgent?: string
): void {
  const context: Parameters<typeof createAuthEvent>[1] = {
    userId,
    email,
    metadata: {
      anomalyType: 'new_location',
      country: location.country,
      city: location.city,
      region: location.region,
    },
  };

  if (ip !== undefined) {
    context.ip = ip;
  }

  if (userAgent !== undefined) {
    context.userAgent = userAgent;
  }

  logAuthEvent(createAuthEvent('location_anomaly', context));
}

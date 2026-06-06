/**
 * Cryptographic Agility Architecture
 *
 * This module defines the interfaces and types for cryptographic agility,
 * enabling algorithm versioning, key rotation, and post-quantum migration.
 *
 * Design Principles:
 * - Inspired by Google Tink's keyset pattern
 * - Supports multiple active keys during rotation
 * - Enables smooth algorithm migration (classical to post-quantum)
 * - Maintains backward compatibility during transitions
 *
 * References:
 * - Google Tink Keyset Design: https://developers.google.com/tink/key-concepts
 * - UK NCSC PQC Migration Timelines: https://www.ncsc.gov.uk/guidance/pqc-migration-timelines
 * - AWS PQC Migration Guide: https://aws.amazon.com/security/post-quantum-cryptography/
 */

/**
 * Algorithm identifiers for versioning
 *
 * Format: <algorithm>-<keysize>-<mode>-<version>
 * Examples: AES-256-GCM-v1, X25519-ECDH-v1, CRYSTALS-Kyber-768-v1
 */
export type AlgorithmIdentifier =
  | 'AES-128-GCM-v1'
  | 'AES-256-GCM-v1'
  | 'X25519-ECDH-v1'
  | 'PBKDF2-SHA256-v1'
  | 'HKDF-SHA256-v1'
  | 'CRYSTALS-Kyber-512-v1' // Future PQC
  | 'CRYSTALS-Kyber-768-v1' // Future PQC
  | 'CRYSTALS-Dilithium2-v1' // Future PQC
  | 'CRYSTALS-Dilithium3-v1' // Future PQC
  | 'HYBRID-X25519-Kyber-v1'; // Future hybrid

/**
 * Algorithm metadata for version tracking
 */
export interface AlgorithmMetadata {
  /** Unique algorithm identifier */
  id: AlgorithmIdentifier;

  /** Human-readable algorithm name */
  name: string;

  /** Algorithm category (encryption, key-exchange, signing, kdf) */
  category: 'encryption' | 'key-exchange' | 'signing' | 'kdf';

  /** Security level (128, 192, 256 bits) */
  securityLevel: 128 | 192 | 256;

  /** Whether this is a post-quantum algorithm */
  isPostQuantum: boolean;

  /** Whether this is a hybrid algorithm (classical + PQC) */
  isHybrid: boolean;

  /** Minimum compatible version for decryption */
  minCompatibleVersion: number;

  /** Maximum compatible version for decryption */
  maxCompatibleVersion: number;

  /** Deprecation status */
  status: 'active' | 'deprecated' | 'legacy' | 'experimental';

  /** Date when algorithm was introduced */
  introducedAt: Date;

  /** Date when algorithm was deprecated (if applicable) */
  deprecatedAt?: Date;

  /** Date when algorithm should no longer be used */
  sunsetAt?: Date;

  /** NIST standard reference (if applicable) */
  nistStandard?: string;

  /** RFC reference (if applicable) */
  rfcReference?: string;
}

/**
 * Key status in a keyset
 */
export type KeyStatus = 'active' | 'enabled' | 'disabled' | 'destroyed';

/**
 * Key usage types
 */
export type KeyUsage = 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'derive';

/**
 * Individual key metadata
 */
export interface KeyMetadata {
  /** Unique key identifier (UUID v4) */
  id: string;

  /** Key version (monotonically increasing) */
  version: number;

  /** Algorithm identifier */
  algorithm: AlgorithmIdentifier;

  /** Key status */
  status: KeyStatus;

  /** Key usage types */
  usage: KeyUsage[];

  /** Key creation timestamp */
  createdAt: Date;

  /** Key expiration timestamp (null for non-expiring keys) */
  expiresAt: Date | null;

  /** Whether this is the primary key (only one per keyset) */
  isPrimary: boolean;

  /** Key size in bits */
  keySize: number;

  /** Whether this is a post-quantum algorithm key */
  isPostQuantum: boolean;

  /** Additional key-specific metadata */
  parameters?: Record<string, unknown>;
}

/**
 * Keyset structure inspired by Google Tink
 *
 * A keyset contains multiple keys for the same primitive,
 * enabling key rotation and algorithm migration.
 */
export interface Keyset {
  /** Keyset identifier (UUID v4) */
  id: string;

  /** Keyset purpose (e.g., 'AEAD', 'MAC', 'SIGNATURE') */
  purpose: string;

  /** Primary key ID (the key used for new operations) */
  primaryKeyId: string;

  /** All keys in the keyset */
  keys: KeyMetadata[];

  /** Keyset creation timestamp */
  createdAt: Date;

  /** Keyset last updated timestamp */
  updatedAt: Date;

  /** Keyset version (for keyset-level versioning) */
  version: number;
}

/**
 * Keyset serialization format
 *
 * Used for persistent storage and transmission.
 * Format inspired by Tink's protobuf-based keyset format.
 */
export interface SerializedKeyset {
  /** Keyset identifier */
  id: string;

  /** Keyset purpose */
  purpose: string;

  /** Primary key ID */
  primaryKeyId: string;

  /** Serialized keys (base64-encoded JSON) */
  keys: string[];

  /** Keyset version */
  version: number;

  /** Signature for integrity verification (base64-encoded) */
  signature?: string;
}

/**
 * Algorithm compatibility matrix
 *
 * Defines which algorithm versions can interoperate.
 */
export interface CompatibilityRule {
  /** Source algorithm */
  from: AlgorithmIdentifier;

  /** Target algorithm */
  to: AlgorithmIdentifier;

  /** Whether these algorithms are compatible */
  compatible: boolean;

  /** Migration strategy if compatible */
  migrationStrategy: 'direct' | 'hybrid' | 're-encrypt' | 'not-supported';

  /** Performance impact of migration */
  performanceImpact: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Version compatibility check result
 */
export interface CompatibilityCheck {
  /** Whether the versions are compatible */
  compatible: boolean;

  /** Reason for incompatibility (if applicable) */
  reason?: string;

  /** Recommended action */
  action: 'proceed' | 'upgrade' | 'migrate' | 'abort';
}

/**
 * Migration plan for algorithm transition
 */
export interface MigrationPlan {
  /** Source algorithm */
  from: AlgorithmIdentifier;

  /** Target algorithm */
  to: AlgorithmIdentifier;

  /** Migration strategy */
  strategy: 'direct' | 'hybrid' | 're-encrypt';

  /** Migration phases */
  phases: MigrationPhase[];

  /** Estimated completion time */
  estimatedDuration: string;

  /** Rollback plan */
  rollbackPlan: string;
}

/**
 * Single migration phase
 */
export interface MigrationPhase {
  /** Phase identifier */
  id: string;

  /** Phase name */
  name: string;

  /** Phase description */
  description: string;

  /** Phase start date */
  startDate: Date;

  /** Phase end date */
  endDate: Date;

  /** Phase status */
  status: 'pending' | 'in-progress' | 'completed' | 'failed';

  /** Phase dependencies (other phase IDs) */
  dependencies: string[];
}

/**
 * Validate algorithm identifier format
 */
export function isValidAlgorithmIdentifier(id: string): id is AlgorithmIdentifier {
  const validIdentifiers: AlgorithmIdentifier[] = [
    'AES-128-GCM-v1',
    'AES-256-GCM-v1',
    'X25519-ECDH-v1',
    'PBKDF2-SHA256-v1',
    'HKDF-SHA256-v1',
    'CRYSTALS-Kyber-512-v1',
    'CRYSTALS-Kyber-768-v1',
    'CRYSTALS-Dilithium2-v1',
    'CRYSTALS-Dilithium3-v1',
    'HYBRID-X25519-Kyber-v1',
  ];
  return validIdentifiers.includes(id as AlgorithmIdentifier);
}

/**
 * Check if two algorithm versions are compatible
 */
export function checkCompatibility(
  from: AlgorithmIdentifier,
  to: AlgorithmIdentifier
): CompatibilityCheck {
  // Same algorithm is always compatible
  if (from === to) {
    return { compatible: true, action: 'proceed' };
  }

  // Post-quantum algorithms not yet supported in Web Crypto API
  if (from.includes('CRYSTALS') || to.includes('CRYSTALS')) {
    return {
      compatible: false,
      reason: 'Post-quantum algorithms not yet supported in Web Crypto API. Consider WebAssembly backend.',
      action: 'abort',
    };
  }

  // Hybrid algorithms not yet implemented
  if (from.includes('HYBRID') || to.includes('HYBRID')) {
    return {
      compatible: false,
      reason: 'Hybrid algorithms not yet implemented. Requires CRYPTO-009 implementation.',
      action: 'abort',
    };
  }

  // Classical algorithm compatibility checks
  const classicalAlgorithms: AlgorithmIdentifier[] = [
    'AES-128-GCM-v1',
    'AES-256-GCM-v1',
    'X25519-ECDH-v1',
    'PBKDF2-SHA256-v1',
    'HKDF-SHA256-v1',
  ];

  if (classicalAlgorithms.includes(from) && classicalAlgorithms.includes(to)) {
    // Different classical algorithms require re-encryption
    return {
      compatible: true,
      reason: 'Algorithms are compatible but require data re-encryption for migration.',
      action: 'migrate',
    };
  }

  return {
    compatible: false,
    reason: 'Unknown compatibility between algorithms.',
    action: 'abort',
  };
}

/**
 * Get algorithm metadata by identifier
 */
export function getAlgorithmMetadata(id: AlgorithmIdentifier): AlgorithmMetadata {
  const metadataMap: Record<AlgorithmIdentifier, AlgorithmMetadata> = {
    'AES-128-GCM-v1': {
      id: 'AES-128-GCM-v1',
      name: 'AES-128-GCM',
      category: 'encryption',
      securityLevel: 128,
      isPostQuantum: false,
      isHybrid: false,
      minCompatibleVersion: 1,
      maxCompatibleVersion: 1,
      status: 'active',
      introducedAt: new Date('2025-01-01'),
    },
    'AES-256-GCM-v1': {
      id: 'AES-256-GCM-v1',
      name: 'AES-256-GCM',
      category: 'encryption',
      securityLevel: 256,
      isPostQuantum: false,
      isHybrid: false,
      minCompatibleVersion: 1,
      maxCompatibleVersion: 1,
      status: 'active',
      introducedAt: new Date('2025-01-01'),
    },
    'X25519-ECDH-v1': {
      id: 'X25519-ECDH-v1',
      name: 'X25519 ECDH',
      category: 'key-exchange',
      securityLevel: 128,
      isPostQuantum: false,
      isHybrid: false,
      minCompatibleVersion: 1,
      maxCompatibleVersion: 1,
      status: 'active',
      introducedAt: new Date('2025-01-01'),
    },
    'PBKDF2-SHA256-v1': {
      id: 'PBKDF2-SHA256-v1',
      name: 'PBKDF2-SHA256',
      category: 'kdf',
      securityLevel: 256,
      isPostQuantum: false,
      isHybrid: false,
      minCompatibleVersion: 1,
      maxCompatibleVersion: 1,
      status: 'active',
      introducedAt: new Date('2025-01-01'),
    },
    'HKDF-SHA256-v1': {
      id: 'HKDF-SHA256-v1',
      name: 'HKDF-SHA256',
      category: 'kdf',
      securityLevel: 256,
      isPostQuantum: false,
      isHybrid: false,
      minCompatibleVersion: 1,
      maxCompatibleVersion: 1,
      status: 'active',
      introducedAt: new Date('2025-01-01'),
    },
    'CRYSTALS-Kyber-512-v1': {
      id: 'CRYSTALS-Kyber-512-v1',
      name: 'CRYSTALS-Kyber-512',
      category: 'key-exchange',
      securityLevel: 128,
      isPostQuantum: true,
      isHybrid: false,
      minCompatibleVersion: 1,
      maxCompatibleVersion: 1,
      status: 'experimental',
      introducedAt: new Date('2026-01-01'),
      nistStandard: 'FIPS 203',
    },
    'CRYSTALS-Kyber-768-v1': {
      id: 'CRYSTALS-Kyber-768-v1',
      name: 'CRYSTALS-Kyber-768',
      category: 'key-exchange',
      securityLevel: 192,
      isPostQuantum: true,
      isHybrid: false,
      minCompatibleVersion: 1,
      maxCompatibleVersion: 1,
      status: 'experimental',
      introducedAt: new Date('2026-01-01'),
      nistStandard: 'FIPS 203',
    },
    'CRYSTALS-Dilithium2-v1': {
      id: 'CRYSTALS-Dilithium2-v1',
      name: 'CRYSTALS-Dilithium2',
      category: 'signing',
      securityLevel: 128,
      isPostQuantum: true,
      isHybrid: false,
      minCompatibleVersion: 1,
      maxCompatibleVersion: 1,
      status: 'experimental',
      introducedAt: new Date('2026-01-01'),
      nistStandard: 'FIPS 204',
    },
    'CRYSTALS-Dilithium3-v1': {
      id: 'CRYSTALS-Dilithium3-v1',
      name: 'CRYSTALS-Dilithium3',
      category: 'signing',
      securityLevel: 192,
      isPostQuantum: true,
      isHybrid: false,
      minCompatibleVersion: 1,
      maxCompatibleVersion: 1,
      status: 'experimental',
      introducedAt: new Date('2026-01-01'),
      nistStandard: 'FIPS 204',
    },
    'HYBRID-X25519-Kyber-v1': {
      id: 'HYBRID-X25519-Kyber-v1',
      name: 'Hybrid X25519 + Kyber',
      category: 'key-exchange',
      securityLevel: 256,
      isPostQuantum: true,
      isHybrid: true,
      minCompatibleVersion: 1,
      maxCompatibleVersion: 1,
      status: 'experimental',
      introducedAt: new Date('2026-01-01'),
    },
  };

  return metadataMap[id];
}

/**
 * Validate keyset structure
 */
export function validateKeyset(keyset: Keyset): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check primary key exists
  const primaryKey = keyset.keys.find((k) => k.id === keyset.primaryKeyId);
  if (!primaryKey) {
    errors.push(`Primary key ${keyset.primaryKeyId} not found in keyset`);
  }

  // Check only one primary key
  const primaryKeys = keyset.keys.filter((k) => k.isPrimary);
  if (primaryKeys.length > 1) {
    errors.push('Keyset cannot have more than one primary key');
  }

  // Check all keys have unique IDs
  const keyIds = keyset.keys.map((k) => k.id);
  const uniqueIds = new Set(keyIds);
  if (keyIds.length !== uniqueIds.size) {
    errors.push('Keyset contains duplicate key IDs');
  }

  // Check all keys have same purpose
  const purposes = new Set(keyset.keys.map((k) => k.algorithm));
  const firstKey = keyset.keys[0];
  if (purposes.size > 1 && firstKey && !keyset.keys.every((k) => k.isPostQuantum === firstKey.isPostQuantum)) {
    // Allow mixing classical and PQC during migration
    errors.push('Keyset should contain keys of the same algorithm category');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new keyset
 */
export function createKeyset(purpose: string, initialKey: KeyMetadata): Keyset {
  return {
    id: crypto.randomUUID(),
    purpose,
    primaryKeyId: initialKey.id,
    keys: [initialKey],
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };
}

/**
 * Add a key to a keyset
 */
export function addKeyToKeyset(keyset: Keyset, key: KeyMetadata): Keyset {
  // Ensure key is not primary
  const newKey = { ...key, isPrimary: false };

  return {
    ...keyset,
    keys: [...keyset.keys, newKey],
    updatedAt: new Date(),
    version: keyset.version + 1,
  };
}

/**
 * Rotate primary key in a keyset
 */
export function rotatePrimaryKey(keyset: Keyset, newPrimaryKeyId: string): Keyset {
  const newKeys = keyset.keys.map((k) => ({
    ...k,
    isPrimary: k.id === newPrimaryKeyId,
  }));

  return {
    ...keyset,
    primaryKeyId: newPrimaryKeyId,
    keys: newKeys,
    updatedAt: new Date(),
    version: keyset.version + 1,
  };
}

/**
 * Disable a key in a keyset
 */
export function disableKey(keyset: Keyset, keyId: string): Keyset {
  const newKeys = keyset.keys.map((k) =>
    k.id === keyId ? { ...k, status: 'disabled' as KeyStatus } : k
  );

  // Ensure primary key is not disabled
  const primaryKey = newKeys.find((k) => k.id === keyset.primaryKeyId);
  if (primaryKey?.status === 'disabled') {
    throw new Error('Cannot disable primary key. Rotate primary key first.');
  }

  return {
    ...keyset,
    keys: newKeys,
    updatedAt: new Date(),
    version: keyset.version + 1,
  };
}

# VPN App Guide

This document defines the architecture and implementation details for the VPN application in the Sovereign Suite.

---

## Overview

The VPN app provides encrypted VPN connectivity with WireGuard on VPS, per-user key provisioning, and bandwidth metering for plan gating.

---

## Domain Model

### VPNConnection

```typescript
interface VPNConnection {
  id: string;
  tenantId: string;
  userId: string;
  serverId: string;
  clientPublicKey: string;
  clientPrivateKey: string; // Encrypted
  serverPublicKey: string;
  ipAddress: string;
  createdAt: Date;
  expiresAt: Date;
}
```

---

## WireGuard on VPS

### WireGuard Configuration

```ini
# /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <server-private-key>
Address = 10.0.0.1/24
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = <client-public-key>
AllowedIPs = 10.0.0.2/32
```

### Docker Deployment

```yaml
# docker-compose.yml
services:
  wireguard:
    image: linuxserver/wireguard
    container_name: wireguard
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    volumes:
      - ./wireguard-config:/config
      - /lib/modules:/lib/modules
    ports:
      - "51820:51820/udp"
    restart: unless-stopped
```

---

## Per-User Key Provisioning

### Key Generation

```typescript
// packages/domain-vpn/src/lib/keys.ts
import { generateKeyPair } from '@suite/crypto';

export async function generateVPNKeys(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  return await generateKeyPair('x25519');
}
```

### Provisioning Flow

```typescript
export async function provisionVPNConnection(
  userId: string,
  tenantId: string
): Promise<VPNConnection> {
  const keys = await generateVPNKeys();
  
  const connection = await db.query(
    `INSERT INTO vpn.connections (tenant_id, user_id, client_public_key, client_private_key, server_public_key, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      tenantId,
      userId,
      keys.publicKey,
      await encrypt(keys.privateKey, masterKey),
      serverPublicKey,
      allocateIPAddress(),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    ]
  );
  
  // Add peer to WireGuard config
  await addWireGuardPeer(keys.publicKey, connection.rows[0].ip_address);
  
  return connection.rows[0];
}
```

---

## Bandwidth Metering

### Traffic Monitoring

```typescript
// packages/domain-vpn/src/lib/bandwidth.ts
export async function trackBandwidth(
  connectionId: string,
  bytesIn: number,
  bytesOut: number
): Promise<void> {
  await db.query(
    `INSERT INTO vpn.bandwidth_usage (connection_id, bytes_in, bytes_out, timestamp)
     VALUES ($1, $2, $3, NOW())`,
    [connectionId, bytesIn, bytesOut]
  );
}
```

### Plan Gating

```typescript
export async function checkBandwidthLimit(
  userId: string,
  plan: string
): Promise<boolean> {
  const limits = {
    free: 10 * 1024 * 1024 * 1024, // 10 GB
    pro: 100 * 1024 * 1024 * 1024, // 100 GB
    enterprise: Infinity,
  };
  
  const usage = await db.query(
    `SELECT COALESCE(SUM(bytes_in + bytes_out), 0) as total
     FROM vpn.bandwidth_usage
     WHERE connection_id IN (SELECT id FROM vpn.connections WHERE user_id = $1)
       AND timestamp >= NOW() - INTERVAL '30 days'`,
    [userId]
  );
  
  return usage.rows[0].total < limits[plan];
}
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vpn/connections` | GET | List VPN connections |
| `/api/vpn/connections` | POST | Create VPN connection |
| `/api/vpn/connections/:id` | GET | Get VPN connection |
| `/api/vpn/connections/:id/config` | GET | Get WireGuard config |
| `/api/vpn/connections/:id` | DELETE | Delete VPN connection |
| `/api/vpn/bandwidth` | GET | Get bandwidth usage |

---

## Encryption Strategy

### Plaintext Fields

- `clientPublicKey` (for WireGuard config)
- `serverPublicKey` (for WireGuard config)
- `ipAddress` (for routing)

### Encrypted Fields

- `clientPrivateKey` (encrypted with user's master key)

---

*This document must be updated when the VPN app architecture changes.*

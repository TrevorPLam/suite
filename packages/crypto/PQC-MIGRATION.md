# Post-Quantum Cryptography Migration Strategy

**Version**: 1.0  
**Date**: 2026-06-06  
**Status**: Design Document

---

## Executive Summary

This document outlines the migration strategy for transitioning from classical cryptographic algorithms to post-quantum cryptography (PQC) in the Sovereign Suite. The strategy aligns with UK NCSC timelines (2028-2035) and AWS best practices for hybrid encryption approaches.

**Key Risk**: "Harvest now, decrypt later" (HNDL) attacks where long-lived sensitive data can be captured today and decrypted by future quantum computers.

**Primary Goal**: Enable smooth migration to PQC algorithms while maintaining backward compatibility and security during the transition period.

---

## Regulatory Timeline

### UK NCSC Recommended Timeline

| Milestone | Date | Activities |
|----------|------|------------|
| **Discovery Phase** | By 2028 | Define migration goals, carry out discovery exercise, build initial plan |
| **Early Migration** | By 2031 | Carry out highest-priority PQC migration activities, refine roadmap |
| **Full Migration** | By 2035 | Complete migration to PQC of all systems, services, and products |

### CNSA 2. Timeline (US National Security)

- **2025**: Initial PQC algorithm selection (NIST finalists announced)
- **2030**: Hybrid key exchange required for national security systems
- **2035**: Purely post-quantum algorithms required for national security systems

### AWS Timeline

- **2024**: AWS KMS implements hybrid PQ-TLS (ML-KEM + ECDH)
- **2025**: AWS services support PQ-TLS endpoints
- **2026-2030**: Gradual rollout of PQC capabilities across services

---

## Algorithm Candidates

### Key Exchange (KEM)

| Algorithm | Security Level | NIST Standard | Status | Notes |
|-----------|----------------|----------------|--------|-------|
| X25519 (ECDH) | 128-bit | - | Current | Classical baseline |
| CRYSTALS-Kyber-512 | 128-bit | FIPS 203 | Future | PQC candidate |
| CRYSTALS-Kyber-768 | 192-bit | FIPS 203 | Future | PQC candidate |
| CRYSTALS-Kyber-1024 | 256-bit | FIPS 203 | Future | PQC candidate |

### Digital Signatures

| Algorithm | Security Level | NIST Standard | Status | Notes |
|-----------|----------------|----------------|--------|-------|
| Ed25519 | 128-bit | - | Current | Classical baseline |
| CRYSTALS-Dilithium2 | 128-bit | FIPS 204 | Future | PQC candidate |
| CRYSTALS-Dilithium3 | 192-bit | FIPS 204 | Future | PQC candidate |
| CRYSTALS-Dilithium5 | 256-bit | FIPS 204 | Future | PQC candidate |

### Encryption

| Algorithm | Security Level | NIST Standard | Status | Notes |
|-----------|----------------|----------------|--------|-------|
| AES-256-GCM | 256-bit | FIPS 197 | Current | Symmetric encryption remains secure against quantum attacks (Grover's algorithm only provides quadratic speedup) |

---

## Migration Strategy

### Phase 1: Preparation (2026-2028)

**Objective**: Establish cryptographic agility infrastructure to enable future PQC migration.

**Activities**:
1. ✅ Design algorithm versioning system (CRYPTO-004)
2. ✅ Design keyset pattern for rotation support (CRYPTO-004)
3. Implement key lifecycle management (CRYPTO-006)
4. Add key wrapping utilities (CRYPTO-005)
5. Audit all cryptographic operations in the codebase
6. Document algorithm usage across all packages
7. Establish PQC monitoring and research process

**Deliverables**:
- Algorithm versioning interfaces in `agility.ts`
- Keyset management utilities
- Key rotation workflow
- Cryptographic inventory report

### Phase 2: Hybrid Encryption (2028-2030)

**Objective**: Implement hybrid key exchange combining classical and PQC algorithms to protect against HNDL attacks.

**Strategy**: Layer PQC primitive on top of established classical algorithm. The combined system remains at least as secure as the current standard.

**Activities**:
1. Add WebAssembly backend (libsodium.js) for PQC algorithms
2. Implement CRYSTALS-Kyber key exchange via WASM
3. Implement hybrid X25519 + Kyber key exchange
4. Update `@suite/crypto` to support hybrid algorithms
5. Add hybrid algorithm to algorithm versioning system
6. Update blind indexing to support PQC-derived keys
7. Test hybrid key exchange performance
8. Document hybrid encryption patterns

**Technical Approach**:
```typescript
// Hybrid key exchange: X25519 + Kyber
const classicalKey = await generateKeyPair('X25519');
const pqcKey = await generateKeyPair('CRYSTALS-Kyber-768');

// Derive shared secrets from both
const classicalShared = await deriveSharedSecret(classicalKey.privateKey, peerClassicalPublicKey);
const pqcShared = await deriveSharedSecret(pqcKey.privateKey, peerPqcPublicKey);

// Combine secrets using HKDF
const combinedSecret = await HKDF(
  await concat(classicalShared, pqcShared),
  salt,
  info,
  256
);
```

**Deliverables**:
- WebAssembly crypto backend
- Hybrid key exchange implementation
- Performance benchmarks
- Hybrid encryption documentation

### Phase 3: Gradual Rollout (2030-2033)

**Objective**: Gradually migrate to hybrid encryption across all services while maintaining backward compatibility.

**Activities**:
1. Enable hybrid encryption for new data by default
2. Migrate high-value data (long-lived sensitive data) first
3. Implement key rotation from classical to hybrid
4. Update domain packages to use hybrid encryption
5. Monitor performance and security metrics
6. Gather feedback and refine implementation

**Migration Priority**:
1. **P0**: Calendar events (long-lived scheduling data)
2. **P0**: Drive files (long-term document storage)
3. **P1**: Tasks (shorter-lived, lower risk)
4. **P2**: Auth sessions (short-lived, can rotate quickly)

**Rollback Plan**:
- Maintain classical algorithm support throughout migration
- Keep classical keys in keysets during transition
- Ability to disable hybrid encryption if issues arise
- Automated rollback triggers on performance degradation

### Phase 4: Pure PQC Transition (2033-2035)

**Objective**: Transition to pure PQC algorithms once ecosystem matures and Web Crypto API adds native support.

**Activities**:
1. Monitor Web Crypto API PQC support
2. Evaluate pure PQC algorithm performance
3. Implement pure PQC key exchange (Kyber-only)
4. Phase out classical algorithms from keysets
5. Update algorithm versioning to mark classical as deprecated
6. Complete migration of all services to pure PQC

**Criteria for Pure PQC**:
- Web Crypto API native PQC support
- Industry-wide PQC adoption
- Performance parity with classical algorithms
- Successful hybrid encryption deployment

---

## Technical Considerations

### Web Crypto API Limitations

The Web Crypto API does not currently support post-quantum algorithms. To address this:

1. **WebAssembly Backend**: Use libsodium.js compiled to WASM for PQC algorithms
2. **Feature Detection**: Detect PQC support and fall back to classical if unavailable
3. **Hybrid Approach**: Combine Web Crypto (classical) + WASM (PQC) for security

### Performance Impact

PQC algorithms have larger key sizes and slower performance:

| Algorithm | Key Size | Encryption Speed | Decryption Speed |
|-----------|----------|------------------|------------------|
| X25519 | 32 bytes | Fast | Fast |
| Kyber-512 | 768 bytes | Medium | Medium |
| Kyber-768 | 1152 bytes | Medium | Medium |
| Hybrid X25519+Kyber | 1184 bytes | Medium | Medium |

**Mitigation**:
- Use hybrid only for key exchange (not bulk encryption)
- Cache derived keys where possible
- Use parallel processing for key derivation
- Monitor performance and optimize hot paths

### Bundle Size Impact

Adding libsodium.js WASM increases bundle size by ~290-375 KB (minified, gzipped).

**Mitigation**:
- Lazy-load WASM module only when PQC is needed
- Use code splitting to separate PQC functionality
- Provide feature flag to disable PQC for performance-critical deployments
- Consider CDN delivery for WASM blob

### Backward Compatibility

Maintain backward compatibility during migration:

1. **Keyset Pattern**: Support multiple active keys (classical + hybrid)
2. **Algorithm Versioning**: Tag ciphertext with algorithm identifier
3. **Graceful Degradation**: Fall back to classical if PQC unavailable
4. **Long Transition Window**: Support classical algorithms through 2035

---

## Security Considerations

### Harvest Now, Decrypt Later (HNDL)

**Risk**: Attackers capture encrypted data today and decrypt with future quantum computers.

**Mitigation**:
- Prioritize hybrid encryption for long-lived data (calendar, drive)
- Use hybrid key exchange for all new TLS connections
- Re-encrypt existing data with hybrid algorithms
- Monitor quantum computing research and adjust timeline

### Algorithm Selection

**Criteria**:
- NIST standardization (FIPS 203, FIPS 204)
- Security level (128-bit minimum, 256-bit preferred)
- Performance characteristics
- Industry adoption
- Patent status (royalty-free preferred)

**Selected Algorithms**:
- **Key Exchange**: CRYSTALS-Kyber-768 (192-bit security)
- **Signatures**: CRYSTALS-Dilithium3 (192-bit security)
- **Hybrid**: X25519 + Kyber-768

### Key Management

**Key Rotation**:
- Rotate keys annually for classical algorithms
- Rotate keys every 6 months for hybrid algorithms
- Rotate keys every 3 months for pure PQC algorithms
- Use keyset pattern to support multiple active keys

**Key Storage**:
- Continue using envelope encryption with KMS
- Store PQC keys in same key hierarchy as classical
- Use key wrapping (AES-KW) for key transport
- Implement crypto-shredding for key deletion

---

## Testing Strategy

### Unit Tests

- Test algorithm versioning interfaces
- Test keyset validation and rotation
- Test compatibility checks between algorithms
- Test hybrid key exchange round-trips
- Test key wrapping/unwrapping with PQC keys

### Integration Tests

- Test end-to-end encryption with hybrid algorithms
- Test key rotation from classical to hybrid
- Test backward compatibility (classical decrypting hybrid)
- Test performance benchmarks
- Test error handling and fallback paths

### Security Tests

- Test side-channel resistance (timing attacks)
- Test known-answer tests (KATs) for PQC algorithms
- Test key derivation security
- Test key zeroization
- Test crypto-shredding

### Performance Tests

- Benchmark hybrid vs classical key exchange
- Measure bundle size impact
- Measure memory usage
- Measure CPU utilization
- Establish performance regression tests

---

## Monitoring and Observability

### Metrics to Track

- **Algorithm Usage**: Track which algorithms are used for encryption/decryption
- **Key Rotation Events**: Track key rotation frequency and success rate
- **Performance**: Track encryption/decryption latency by algorithm
- **Errors**: Track PQC-related errors and fallback events
- **Bundle Size**: Track WASM bundle size and load time

### Alerts

- Alert if PQC encryption error rate > 1%
- Alert if hybrid encryption latency > 2x classical
- Alert if key rotation fails
- Alert if classical algorithm usage increases after migration

---

## References

- UK NCSC PQC Migration Timelines: https://www.ncsc.gov.uk/guidance/pqc-migration-timelines
- AWS PQC Migration Guide: https://aws.amazon.com/security/post-quantum-cryptography/
- NIST PQC Standardization: https://www.nist.gov/cryptography/post-quantum-cryptography
- Google Tink Keyset Design: https://developers.google.com/tink/key-concepts
- CRYSTALS-Kyber Specification: https://pq-crystals.org/kyber/
- CRYSTALS-Dilithium Specification: https://pq-crystals.org/dilithium/
- libsodium.js Documentation: https://doc.libsodium.org/

---

## Appendix: Migration Checklist

### Pre-Migration (2026-2028)
- [ ] Design algorithm versioning system
- [ ] Design keyset pattern
- [ ] Implement key lifecycle management
- [ ] Implement key wrapping utilities
- [ ] Audit cryptographic operations
- [ ] Document algorithm usage
- [ ] Establish PQC monitoring process

### Hybrid Encryption (2028-2030)
- [ ] Add WebAssembly backend
- [ ] Implement CRYSTALS-Kyber key exchange
- [ ] Implement hybrid X25519 + Kyber
- [ ] Update algorithm versioning system
- [ ] Update blind indexing for PQC
- [ ] Test hybrid key exchange
- [ ] Document hybrid encryption

### Gradual Rollout (2030-2033)
- [ ] Enable hybrid for new data
- [ ] Migrate calendar events
- [ ] Migrate drive files
- [ ] Migrate tasks
- [ ] Migrate auth sessions
- [ ] Monitor performance
- [ ] Gather feedback

### Pure PQC Transition (2033-2035)
- [ ] Monitor Web Crypto API PQC support
- [ ] Evaluate pure PQC performance
- [ ] Implement pure PQC key exchange
- [ ] Phase out classical algorithms
- [ ] Update algorithm versioning
- [ ] Complete migration

---

*This document will be updated as PQC standards evolve and implementation progresses.*

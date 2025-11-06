# Privacy Configuration Guide

## Overview

SafeVoice is built with **privacy-by-default** principles, implementing multiple layers of protection to ensure complete anonymity and zero tracking. This document outlines the privacy architecture, configuration options, and testing procedures.

## Table of Contents

1. [Privacy Architecture](#privacy-architecture)
2. [Security Headers](#security-headers)
3. [Privacy Middleware](#privacy-middleware)
4. [Analytics Policy](#analytics-policy)
5. [Configuration Options](#configuration-options)
6. [Testing & Auditing](#testing--auditing)
7. [Compliance & Transparency](#compliance--transparency)

---

## Privacy Architecture

### Core Principles

1. **No Tracking**: Zero third-party analytics or telemetry
2. **Local-First**: All data stored in browser localStorage, encrypted
3. **Cookie-Free**: Programmatic cookie blocking at application layer
4. **Network Isolation**: Strict domain allowlist for outbound requests
5. **WebRTC Protection**: IP leak mitigation via relay-only ICE policy
6. **Fingerprint Resistance**: Active defenses against browser fingerprinting

### Privacy Middleware Layer

Location: `src/lib/privacy/middleware.ts`

The privacy middleware provides:

- **URL Allowlist Validation**: Blocks requests to unauthorized domains
- **Cookie Stripping**: Removes cookies/credentials from all fetch requests
- **HTTPS Enforcement**: Redirects HTTP to HTTPS in production
- **WebRTC Shimming**: Replaces RTCPeerConnection with privacy-enhanced version
- **Storage Sanitization**: Removes non-whitelisted localStorage keys

#### Initialization

The middleware is initialized before React mounts:

```typescript
// src/main.tsx
import { initializePrivacyProtections } from './lib/privacy/middleware';

initializePrivacyProtections();
```

This runs three critical protections:

1. `installWebRTCPrivacyShim()` - Replaces RTCPeerConnection globally
2. `sanitizeLocalStorage()` - Removes unauthorized storage keys
3. `blockCookies()` - Intercepts document.cookie API

---

## Security Headers

### Meta Tags in index.html

All security headers are configured via meta tags in `index.html`:

#### Content Security Policy (CSP)

```html
<meta 
  http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
           script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
           style-src 'self' 'unsafe-inline'; 
           img-src 'self' data: https:; 
           font-src 'self' data:; 
           connect-src 'self' https://eth-mainnet.g.alchemy.com https://polygon-mainnet.g.alchemy.com https://rpc.ankr.com https://cloudflare-eth.com https://*.infura.io wss://eth-mainnet.g.alchemy.com wss://polygon-mainnet.g.alchemy.com; 
           frame-ancestors 'none'; 
           base-uri 'self'; 
           form-action 'self';"
/>
```

**Purpose**: Restricts resource loading to trusted sources only

**Key Directives**:
- `default-src 'self'`: Only load resources from same origin
- `connect-src`: Explicitly allow Web3 RPC endpoints for blockchain interaction
- `frame-ancestors 'none'`: Prevent embedding in iframes (clickjacking protection)

#### Referrer Policy

```html
<meta name="referrer" content="no-referrer" />
```

**Purpose**: Prevents leaking referrer information to external sites

#### Permissions Policy

```html
<meta 
  http-equiv="Permissions-Policy" 
  content="geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
/>
```

**Purpose**: Disables sensitive browser APIs that could be used for tracking

#### X-Content-Type-Options

```html
<meta http-equiv="X-Content-Type-Options" content="nosniff" />
```

**Purpose**: Prevents MIME type sniffing attacks

#### X-Frame-Options

```html
<meta http-equiv="X-Frame-Options" content="DENY" />
```

**Purpose**: Additional clickjacking protection (defense in depth with CSP)

### HSTS (HTTP Strict Transport Security)

**Note**: HSTS must be set via HTTP headers, not meta tags. When deploying SafeVoice, configure your server/CDN to send:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**GitHub Pages**: Automatically enforces HTTPS with HSTS headers.

### Subresource Integrity (SRI)

If adding external scripts/styles, use SRI hashes:

```html
<script 
  src="https://example.com/library.js" 
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
```

**Current Status**: SafeVoice has no external scripts, so SRI is not required.

---

## Privacy Middleware

### privacyFetch API

Replace all `fetch()` calls with `privacyFetch()` for enhanced privacy:

```typescript
import { privacyFetch } from '@/lib/privacy/middleware';

// Automatically strips cookies, validates domain, enforces HTTPS
const response = await privacyFetch('https://eth-mainnet.g.alchemy.com/v2/key', {
  method: 'POST',
  body: JSON.stringify({ /* ... */ }),
});
```

**Features**:
- ✅ Validates URL against domain allowlist
- ✅ Strips `Cookie` headers and sets `credentials: 'omit'`
- ✅ Redirects HTTP → HTTPS in production (localhost excepted)
- ✅ Throws error for blocked domains

### Domain Allowlist

Current allowed domains (configurable in `middleware.ts`):

```typescript
const ALLOWED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'safevoice009.github.io',
  // Blockchain RPC endpoints
  'eth-mainnet.g.alchemy.com',
  'polygon-mainnet.g.alchemy.com',
  'rpc.ankr.com',
  'cloudflare-eth.com',
  'infura.io',
];
```

**To add a domain**: Edit `ALLOWED_DOMAINS` in `src/lib/privacy/middleware.ts`

### localStorage Whitelist

Only these keys are allowed to persist:

```typescript
export const ALLOWED_STORAGE_KEYS = [
  'safevoice:studentId',
  'safevoice:theme',
  'safevoice:language',
  'safevoice:wallet',
  'safevoice:redirect',
  'safevoice:balance',
  'safevoice:posts',
  'safevoice:bookmarks',
  'safevoice:achievements',
  'safevoice:nftBadges',
  'safevoice:premiumFeatures',
  'safevoice:transactions',
  'safevoice:communities',
  'safevoice:notifications',
  'safevoice:resources',
];
```

**Sanitization**: On startup, `sanitizeLocalStorage()` removes any keys not in this list.

**To add a key**: 
1. Add to `ALLOWED_STORAGE_KEYS` array
2. Prefix with `safevoice:` for namespacing
3. Update tests in `privacyMiddleware.test.ts`

### WebRTC IP Leak Protection

The `PrivacyRTCPeerConnection` class extends `RTCPeerConnection`:

```typescript
export class PrivacyRTCPeerConnection extends RTCPeerConnection {
  constructor(configuration?: RTCConfiguration) {
    const privacyConfig: RTCConfiguration = {
      ...configuration,
      iceTransportPolicy: 'relay', // Force TURN servers only
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    };
    super(privacyConfig);
  }
}
```

**Behavior**:
- Sets `iceTransportPolicy: 'relay'` to prevent host/srflx candidates
- Requires TURN servers in production (prevents P2P IP leaks)
- Logs usage for auditing

**Status**: SafeVoice does not currently use WebRTC, so this is a preventive measure.

### Cookie Blocking

The middleware intercepts `document.cookie`:

```typescript
Object.defineProperty(document, 'cookie', {
  get() {
    console.warn('[Privacy] Attempted to read cookies (blocked)');
    return '';
  },
  set(value: string) {
    console.warn('[Privacy] Attempted to set cookie (blocked):', value);
    // Do nothing
  },
});
```

**Result**: All cookie read/write attempts are blocked and logged.

---

## Analytics Policy

### Current Policy: **Zero Analytics**

SafeVoice **does not use** any analytics or tracking services:

- ❌ No Google Analytics
- ❌ No Facebook Pixel
- ❌ No Mixpanel, Amplitude, Heap, Segment, etc.
- ❌ No telemetry or crash reporting
- ❌ No IP logging or user behavior tracking

### Future Policy: **Opt-In Only**

If analytics are ever introduced:

1. **Must be opt-in**: Explicit user consent required
2. **Privacy-preserving**: Use privacy-focused tools (e.g., Plausible, Fathom)
3. **Transparent**: Clear disclosure in Settings UI
4. **Anonymous**: No PII collection, aggregated data only
5. **Auditable**: Open source and documented

### Settings UI Disclosure

The Privacy Settings panel (`src/components/settings/PrivacySettings.tsx`) displays:

- ✅ Zero tracking status
- ✅ Cookie-free verification
- ✅ Security headers active
- ✅ Domain allowlist
- ✅ Storage key whitelist

**Access**: Profile → Settings → Privacy & Security

---

## Configuration Options

### Environment Variables

No privacy-related environment variables are currently exposed. All privacy protections are enabled by default.

### Build-Time Configuration

- `import.meta.env.PROD`: Controls HTTPS enforcement
  - `true`: Redirects HTTP → HTTPS (production)
  - `false`: Allows HTTP for localhost (development)

### Runtime Configuration

To modify privacy settings, edit:

1. **Domain Allowlist**: `src/lib/privacy/middleware.ts` → `ALLOWED_DOMAINS`
2. **Storage Whitelist**: `src/lib/privacy/middleware.ts` → `ALLOWED_STORAGE_KEYS`
3. **CSP Policy**: `index.html` → CSP meta tag content

---

## Testing & Auditing

### Automated Tests

#### Privacy Test Suite

```bash
npm run test:privacy
```

**Coverage**:
- Network call domain validation
- Cookie blocking
- WebRTC IP leak mitigation
- Canvas fingerprinting detection
- localStorage PII checks
- Third-party script detection

**Location**: `src/lib/__tests__/privacy.test.ts`

#### Privacy Middleware Tests

```bash
npm test src/lib/__tests__/privacyMiddleware.test.ts
```

**Coverage**:
- CSP meta tag verification
- Referrer-Policy validation
- privacyFetch behavior
- localStorage whitelist enforcement
- Cookie blocking
- WebRTC protection

**Location**: `src/lib/__tests__/privacyMiddleware.test.ts`

### Manual Audit Checklist

See [PRIVACY_AUDIT_CHECKLIST.md](./PRIVACY_AUDIT_CHECKLIST.md) for:

- Browser DevTools inspection
- Network monitoring
- Cookie/localStorage audits
- Third-party script scanning
- WebRTC leak testing
- Fingerprinting resistance checks

### Browser Extensions for Testing

- **Privacy Badger**: Detects third-party trackers
- **uBlock Origin**: Blocks tracking requests
- **Cookie AutoDelete**: Verifies no cookies persist
- **WebRTC Leak Test**: Checks for IP leaks
- **CanvasBlocker**: Detects canvas fingerprinting

### Continuous Integration

Privacy tests run on every commit via GitHub Actions:

```yaml
# .github/workflows/security.yml
- name: Privacy Tests
  run: npm run test:privacy
```

---

## Compliance & Transparency

### GDPR Compliance

SafeVoice is **GDPR-compliant by design**:

- ✅ No personal data collection
- ✅ No cookies requiring consent
- ✅ No cross-site tracking
- ✅ Full data portability (localStorage export)
- ✅ Right to erasure (clear browser data)

**Data Controller**: Not applicable (no server-side storage)

### COPPA Compliance

SafeVoice is suitable for users under 13:

- ✅ No PII collection
- ✅ No behavioral tracking
- ✅ No advertising
- ✅ No third-party data sharing

### India DPDP Act 2023

SafeVoice complies with India's Digital Personal Data Protection Act:

- ✅ No personal data processing
- ✅ No data localization requirements (no server)
- ✅ No consent mechanisms needed (no data collection)

### Open Source Transparency

SafeVoice's privacy implementations are **fully open source**:

- **Repository**: [github.com/safevoice009/Safevoice-cto](https://github.com/safevoice009/Safevoice-cto)
- **License**: MIT
- **Audit Welcome**: Community security audits encouraged

---

## Troubleshooting

### "Request blocked: Domain not in allowlist"

**Cause**: Attempting to fetch from a non-whitelisted domain.

**Solution**: Add the domain to `ALLOWED_DOMAINS` in `src/lib/privacy/middleware.ts` if it's a trusted service.

### localStorage Key Removed on Startup

**Cause**: Key not in `ALLOWED_STORAGE_KEYS` whitelist.

**Solution**: Add the key to `ALLOWED_STORAGE_KEYS` with `safevoice:` prefix.

### CSP Violation Errors

**Cause**: Loading resources from non-CSP-approved sources.

**Solution**: 
1. Update CSP policy in `index.html` to allow the source
2. Or host the resource locally to comply with `'self'` directive

### WebRTC Not Working

**Cause**: Relay-only ICE policy requires TURN servers.

**Solution**: Configure TURN servers in RTCPeerConnection config:

```typescript
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:turn.example.com:3478',
      username: 'user',
      credential: 'pass',
    },
  ],
});
```

---

## Maintenance & Updates

### Adding New Privacy Features

1. Implement feature in `src/lib/privacy/middleware.ts`
2. Add tests to `src/lib/__tests__/privacyMiddleware.test.ts`
3. Update this documentation
4. Update Settings UI in `src/components/settings/PrivacySettings.tsx`
5. Announce in release notes

### Reviewing Third-Party Dependencies

Before adding any dependency, verify:

- [ ] No analytics/tracking code
- [ ] No cookie usage
- [ ] No external network calls
- [ ] Open source license
- [ ] Active maintenance

Run automated check:

```bash
npm run test:privacy
```

### Security Patching

Privacy-related security issues should be reported to:

**Email**: [security contact needed]

**Response SLA**: 48 hours for critical issues

---

## Additional Resources

- [Privacy Audit Checklist](./PRIVACY_AUDIT_CHECKLIST.md)
- [Web3 Bridge Documentation](./WEB3_BRIDGE_DOCS.md)
- [Security Best Practices](./web3-deployment.md)
- [Communities Technical Overview](./COMMUNITIES_TECH_OVERVIEW.md)

---

## Contact & Support

For privacy-related questions or concerns:

- **GitHub Issues**: [SafeVoice Issues](https://github.com/safevoice009/Safevoice-cto/issues)
- **Community**: Discord/Telegram (links in README)

---

**Last Updated**: 2024-01-XX  
**Version**: 2.1.0  
**Maintained By**: SafeVoice Core Team

## 11. Frontend & Mobile Strategy

Every user interaction with the Sovereign Suite begins and ends in the frontend. Whether the user is typing an email in a browser tab, swiping through photos on a mobile device, or dragging a task card on a desktop, the frontend layer must deliver instant responsiveness, pixel-perfect consistency across 53 applications, and uncompromising privacy. This section establishes the technical foundation—shared components, unified styling, cross‑app navigation, and the mobile strategy—that makes that possible without duplicating work or fracturing the user experience.

---

### 11.1 The Core Frontend Stack

The Sovereign Suite frontend is built on the 2026 industry‑standard SPA stack, chosen for performance, developer experience, and AI‑agent compatibility.

| Technology | Version | Role | Why This Choice |
|------------|---------|------|----------------|
| **React** | 19 | UI framework | React 19’s compiler and improved primitives reduce boilerplate and improve runtime performance |
| **Vite** | 7 | Build tool | Instant server start and HMR; 3–5× faster than legacy bundlers |
| **TanStack Query** | v5 | Server‑state management | Automatic caching, deduplication, background refetching; critical for multi‑app data consistency |
| **TanStack Router** | v1 | Type‑safe routing | Full type inference for routes and search params; eliminates runtime routing bugs |
| **Tailwind CSS** | 4 | Styling | CSS‑first configuration with `@theme`; Rust‑powered engine for near‑zero build overhead |
| **shadcn/ui** | v4 | Component primitives | You own the source; no lock‑in, forkable, highly customisable |
| **TypeScript** | 5.8 | Type safety | Strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| **Vite Plugin** | `@tailwindcss/vite` | Tailwind integration | Native Vite plugin for Tailwind CSS v4 |

**React 19 + TanStack Query division of responsibility:**

React 19 provides primitives for individual async operations (`use()`, `useActionState`, `useOptimistic`). TanStack Query handles cross‑component concerns: request deduplication, background refetching, cache invalidation, pagination, and DevTools. The clean split used in production is: **reads → TanStack Query; mutations → `useMutation` + React 19 `useOptimistic`**. This combination gives type safety, optimistic updates with automatic rollback on error, and centralised query cache invalidation across the entire suite.

---

### 11.2 Shared UI Kit (`packages/ui-kit`)

All 53 applications consume components and styles from `packages/ui-kit`, the single source of truth for the Sovereign Suite’s design system.

#### 11.2.1 Package Structure

```
packages/ui-kit/
├── src/
│   ├── components/           # shadcn primitives + domain components
│   │   ├── ui/               # vendored shadcn components (Button, Dialog, etc.)
│   │   ├── layout/           # AppShell, Sidebar, TopBar, Footer
│   │   └── forms/            # Form primitives with react‑hook‑form
│   ├── styles/
│   │   └── globals.css       # Tailwind v4 @theme directives
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   ├── use-mobile.ts
│   │   └── use-theme.ts
│   └── providers/            # QueryClientProvider, ThemeProvider, etc.
├── tailwind.config.ts
├── components.json           # shadcn/ui configuration
└── package.json
```

#### 11.2.2 Shared Tailwind CSS v4 Configuration

Tailwind CSS v4 uses a CSS‑first configuration with `@theme` directives, making design tokens trivially shareable across a monorepo. The shared package exposes tokens as a plain CSS file that each app imports, eliminating copy‑pasted configs.

**`packages/ui-kit/src/styles/globals.css`:**

```css
@import "tailwindcss";

@theme {
  /* Semantic token contract — OKLCH color space for wider gamut and consistency */
  --color-primary: oklch(55% 0.19 260);
  --color-primary-light: oklch(84% 0.07 255);
  --color-primary-dark: oklch(40% 0.17 262);
  --color-secondary: oklch(52% 0.14 175);
  --color-ink: oklch(26% 0.05 264);
  --color-canvas: oklch(97% 0.002 252);
  --color-success: oklch(55% 0.16 147);
  --color-error: oklch(59% 0.19 38);

  --font-sans: system-ui, -apple-system, sans-serif;
  --font-serif: "Times New Roman", Georgia, serif;

  --shadow-md: 0 4px 12px oklch(0% 0 0 / 10%);
  --radius-md: 0.5rem;
}

@custom-variant dark (&:where(.dark, .dark *));
```

**Consumption in an app (`apps/calendar/web/src/index.css`):**

```css
@import "@suite/ui-kit/styles/globals.css";
```

The `package.json` of each app depends on `@suite/ui-kit` using pnpm’s `workspace:*` protocol. The Tailwind content scanner must also scan the shared package—modern Nx and Turborepo setups automate this via plugins like `@juristr/nx-tailwind-sync`.

#### 11.2.3 shadcn/ui in the Monorepo

shadcn/ui v4 components are vendored directly into `packages/ui-kit/src/components/ui/` using the CLI:

```bash
cd packages/ui-kit && npx shadcn@latest add button card dialog
```

The vendored components become your source code—you own them, modify them, and audit them. Each consuming app then imports them from `@suite/ui-kit` rather than from `shadcn/ui` directly. This pattern is validated by monorepo references such as the Turborepo Vite + shadcn/ui starter kit and the next‑shell reference implementation.

#### 11.2.4 Shell / App Layout

The shared `AppShell` component wraps every application. It provides:

- Responsive sidebar with cookie‑persisted collapsed state
- Top navigation bar with theme toggle, user menu, and app switcher
- Command palette (⌘K) for cross‑app navigation and actions
- Toast notifications (Sonner) and global error boundary

This shell is implemented once in `packages/ui-kit` and imported by each app’s `App.tsx`. The pattern ensures that adding a new app does not require rewriting the shell. The next‑shell reference implementation proves this pattern is production‑ready: 712 tests across 29 test files cover render, interaction, SSR helpers, provider composition, and auth adapter contracts.

---

### 11.3 Cross‑Application Navigation: The Shell

You have 53 separate SPAs, not a single monolithic frontend. Users must navigate between them without friction. The architectural decision—independent SPAs with a **shared shell**—avoids the complexity of Module Federation while preserving a cohesive experience.

#### 11.3.1 The Shell Pattern

The Shell is not a runtime composition engine. It is a lightweight wrapper that provides global navigation, authentication state, and cross‑app context. The Shell is deployed as its own static site (`apps/shell/web`), hosted at `app.yourdomain.com`. From there, users launch individual applications, which open as full‑page SPAs at `calendar.yourdomain.com`, `drive.yourdomain.com`, etc.

#### 11.3.2 Why Not Module Federation?

While Micro‑Frontends and Module Federation are mature, they introduce operational complexity that is unnecessary for a solo founder and may conflict with the suite’s zero‑knowledge and cost goals.

| Concern | Explanation |
|---------|-------------|
| **Operational complexity** | Module Federation requires dependency version negotiation (shared singleton bundles), fallback handling, and cross‑app communication orchestration—a large surface area for subtle failures |
| **Runtime security** | Runtime code sharing across independently deployed apps creates an additional attack surface not present in isolated SPAs |
| **Build chain complexity** | Federation plug‑ins for Vite (e.g., `@originjs/vite-plugin-federation`) exist but are less mature than the Webpack equivalents; build caching is also affected as bundlers cannot easily predict cross‑app dependencies |
| **Cost** | The shared runtime dependencies (e.g., React singleton) must be served from somewhere, consuming CDN bandwidth across all apps; with independent SPAs, each app loads its own dependencies but benefits from aggressive CDN caching |
| **Better alternatives** | For framework‑agnostic micro‑frontends, tools like **Native Federation** (built for Vite/esbuild) offer much faster build times than Webpack Module Federation, but even then the complexity is rarely justified for a single‑developer team |

**Decision for the Sovereign Suite:** Avoid Module Federation. Use independent SPAs deployed to Cloudflare Pages. The shared shell provides a unified launch point. Cross‑app state (e.g., authentication, theme preferences) is communicated via the shared domain cookie (`.yourdomain.com`) and local storage with `@suite/ui-kit/hooks`.

For the rare case where runtime composition is genuinely required (e.g., embedding a Drive file picker inside Mail), use the established pattern of `window.postMessage` between iframes, wrapped in a secure typed messaging library that respects origin validation.

---

### 11.4 Mobile Strategy: Capacitor

The Sovereign Suite’s mobile strategy is **“write once, run on iOS and Android.”** Every SPA in `apps/*/web` can be packaged as a native mobile app using Capacitor, with no second codebase.

#### 11.4.1 Capacitor Architecture

Capacitor wraps the web build into a native shell. The UI runs in a WebView (WKWebView on iOS, standard WebView on Android), while Capacitor plugins bridge JavaScript calls to native APIs.

**Project structure for a mobile app:**

```
apps/calendar/
├── web/                    # Vite SPA (shared with web)
├── mobile/
│   ├── ios/                # Xcode project (generated)
│   ├── android/            # Android Studio project (generated)
│   ├── capacitor.config.ts
│   └── package.json
└── ...
```

The build process:

```bash
cd apps/calendar/web && pnpm build           # Build web SPA
cd ../mobile && npx cap sync                 # Copy build to native projects
npx cap open ios                             # Open in Xcode
```

Capacitor’s WebView is optimised for mobile performance and integrates directly with native APIs, providing a unified development experience.

#### 11.4.2 Secure Storage and Biometrics

Mobile apps require storing session tokens and encryption keys securely. Capacitor provides three options:

| Storage | Use Case | Security Level |
|---------|----------|----------------|
| **`@capacitor/preferences`** | User preferences, theme settings | Unencrypted, accessible via file system |
| **`@aparajita/capacitor-secure-storage`** | Session tokens, OAuth refresh tokens | Encrypted with device key, accessible only to your app |
| **iOS Keychain / Android Keystore** | Cryptographic keys, biometric‑protected secrets | Highest; backed by dedicated security hardware |

**Rule:** Never embed secrets in app code. Never use `@capacitor/preferences` for authentication tokens or encryption keys. Always use the secure keychain/keystore APIs for sensitive values. For biometric‑protected secrets, use the iOS Keychain Services and Android Keystore APIs.

The `packages/mobile` package provides unified TypeScript wrappers:

```typescript
// packages/mobile/src/secureStorage.ts
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

export async function setSecureItem(key: string, value: string): Promise<void> {
  await SecureStorage.set({ key, value });
}

export async function getSecureItem(key: string): Promise<string | null> {
  const { value } = await SecureStorage.get({ key });
  return value ?? null;
}
```

Biometric authentication uses the `@aparajita/capacitor-biometric-auth` plugin, with a fallback to device passcode when biometrics are unavailable.

#### 11.4.3 Push Notifications

Mobile push notifications require a device‑specific token (APNS for iOS, FCM for Android). Because Cloudflare Workers cannot directly send APNS/FCM pushes, the Sovereign Suite implements a bridge:

1. **Web client:** Uses Cloudflare Workers + Web Push API (service worker registration). Compatible with Durable Objects for triggering push notifications from real‑time events.
2. **Mobile app:** Workers enqueue notification jobs to Cloudflare Queues; a dedicated Node.js service on the VPS consumes the queue and calls APNS/FCM. Push tokens are stored in the database, encrypted at rest.

For E2EE push notifications, payloads are encrypted with the user’s public key. The mobile app decrypts the notification body using the locally stored private key, never exposing plaintext to the push gateway.

---

### 11.5 Offline‑First Considerations

Offline capability is non‑negotiable for a productivity suite. Users must access their calendar, read emails, and draft documents on aeroplanes and in dead zones. The Sovereign Suite implements offline support at three layers:

| Layer | Implementation |
|-------|----------------|
| **Service Worker** | Caches static assets (HTML, JS, CSS) and API responses for basic browsing |
| **IndexedDB / SQLite** | Stores encrypted offline data. SQLite with sqlcipher is preferred for mobile; IndexedDB with WebCrypto for web |
| **Sync engine** | Durable Objects coordinate offline changes. When connectivity returns, the client uploads batched operations encrypted with the domain key |

The sync engine is built on CRDTs (Yjs for text; simpler last‑write‑wins for structured data). A dedicated Durable Object per user (for Drive) or per document (for collaborative editing) manages conflict resolution and incremental sync.

---

### 11.6 Key Takeaways: Frontend Architecture

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **SPA framework** | React 19 + Vite 7 | React 19’s compiler; Vite’s instant HMR |
| **Server‑state management** | TanStack Query v5 | Deduplication, background refetching, cache coordination across apps |
| **Component library** | shadcn/ui v4 (vendored) | You own the source; no lock‑in |
| **Styling** | Tailwind CSS v4 with shared tokens in `packages/ui-kit` | CSS‑first configuration; easy monorepo sharing; OKLCH colour space |
| **Cross‑app navigation** | Independent SPAs + shared shell (`apps/shell/web`) | No Module Federation complexity; unified cookie domain for auth |
| **Mobile** | Capacitor 6 | Shared web codebase; native API access; secure storage; biometrics |
| **Offline** | Service worker + SQLite/IndexedDB + CRDT sync via Durable Objects | Permits offline editing; queued sync on reconnection |

---

### 11.7 AI Agent Rules (Frontend)

The following rules are added to `AGENTS.md` to enforce frontend consistency across all 53 applications:

```markdown
## Frontend Rules (AI Agents Must Follow)

1. **Never duplicate UI components.** All components must be added to `packages/ui-kit` and imported from `@suite/ui-kit`.
2. **Shared tokens live in `@theme`.** Colors, spacing, typography, shadows are defined in `packages/ui-kit/src/styles/globals.css`. No hard‑coded values in apps.
3. **Use TanStack Query for all server‑state.** Reads → `useQuery`. Mutations → `useMutation` with optimistic updates. Never use `fetch` directly in components.
4. **TypeScript strict mode is mandatory.** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noImplicitOverride` must be enabled.
5. **Mobile apps use secure storage.** Tokens and keys go in `@aparajita/capacitor-secure-storage`, never `@capacitor/preferences`.
6. **Push notifications are encrypted.** Payloads must be encrypted with the user’s public key before sending to APNS/FCM.
7. **Offline data is encrypted.** SQLite databases must use sqlcipher; IndexedDB stores must be encrypted with WebCrypto.
8. **Never embed secrets in client code.** API keys, tokens, and encryption keys are injected via environment variables at build time.
9. **Respect the shell pattern.** The shell (`apps/shell/web`) is the launch point. Apps must not embed shell functionality.
10. **Accessibility is not optional.** All components must support keyboard navigation, ARIA attributes, and screen readers. Use `eslint-plugin-jsx-a11y`.
```

---

The frontend and mobile architecture of the Sovereign Suite delivers a cohesive, privacy‑preserving experience across 53 applications and multiple device types. Every component, style, and hook is shared; every application is isolated; and every user interaction is protected by the zero‑knowledge guarantee.
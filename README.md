# @errorgap/nuxt

Nuxt module for [Errorgap](https://errorgap.com). It reports both **client**
(browser / Vue) and **server** (Nitro) errors to your Errorgap project, wiring
[`@errorgap/browser`](https://github.com/errorgaphq/errorgap-js) and
[`@errorgap/node`](https://github.com/errorgaphq/errorgap-node) into Nuxt's
plugin and Nitro hooks.

Works with Nuxt 3+.

## Install

```sh
npm install @errorgap/nuxt
```

## Configure

Add the module and your project settings to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["@errorgap/nuxt"],
  errorgap: {
    endpoint: "https://errorgap.example.com",
    projectSlug: "my-project",
    // Ingestion-only key. It can submit notices but not read data, so — like a
    // Sentry DSN — it is included in the client bundle for browser reporting.
    apiKey: process.env.ERRORGAP_API_KEY,
    environment: process.env.NODE_ENV,
    release: process.env.NUXT_APP_VERSION,
  },
});
```

Connection settings can also be provided through `runtimeConfig` (handy for
per-environment secrets):

```ts
export default defineNuxtConfig({
  modules: ["@errorgap/nuxt"],
  runtimeConfig: {
    errorgap: { apiKey: "" }, // NUXT_ERRORGAP_API_KEY
    public: {
      errorgap: { endpoint: "", projectSlug: "" }, // NUXT_PUBLIC_ERRORGAP_*
    },
  },
});
```

Once configured, the module automatically reports:

- **Client:** Vue render/lifecycle errors (`vue:error`), fatal app errors
  (`app:error`), and — via `@errorgap/browser` — uncaught `window` errors and
  unhandled promise rejections, with source-map-resolved stack traces.
- **Server:** every unhandled Nitro request error, with the request method and
  path as context.

## Options

| Option | Default | Notes |
|---|---|---|
| `endpoint` | — | **Required.** Errorgap base URL |
| `projectSlug` | — | **Required.** |
| `projectId` | — | |
| `apiKey` | — | Ingestion-only key (`x-errorgap-project-key`); safe in the client bundle |
| `environment` | `"production"` | |
| `release` | — | |
| `sampleRate` | `1` | Fraction (0..1) of errors reported |
| `sourceMaps` | `true` | Resolve client frames through source maps |
| `client` | `true` | Capture browser errors |
| `server` | `true` | Capture Nitro errors |
| `apm` | `false` | Record each server request as an APM transaction (route template, status, duration), linked to the errors it raised and — via the browser SDK's `x-errorgap-trace` header — to the browser's view of the call |
| `apmSampleRate` | `1` | Fraction of server transactions sent |
| `captureGlobals` | `true` | Install window/process handlers |
| `ignoreStatusCodes` | every 4xx | HTTP statuses of H3/Nuxt errors (`createError({ statusCode })`) that aren't reported, on the server and in the browser. `[]` reports them all |
| `performance` | `false` | `true` or `{ sampleRate, trackRequests, flushIntervalMs, tracePropagationTargets }` — browser page loads, navigations, Core Web Vitals and API calls, grouped by Vue Router's matched route. API calls carry an `x-errorgap-trace` header (same origin, plus any `tracePropagationTargets` prefixes) that links them to server traces |
| `replay` | `true` | Session replay in the browser, as the project's replay settings allow (nothing while replay is off in Errorgap). `false` turns it off in this app; `{ flushIntervalMs }` tunes it. See [Session replay](#session-replay) |

## Noise, duplicates and ignored environments

```ts
errorgap: {
  ignoreEnvironments: ["test"],
  ignoreStatusCodes: [404, 410], // default: every 4xx; [] reports them all
  ignoreNoise: true,      // browser: drop Script error., extension errors, ResizeObserver notices
  dedupeWindowMs: 1000,   // browser: an identical error at most once a second
}
```

With `@errorgap/browser` 0.6 and `@errorgap/node` 0.5 the module also retries
failed sends, stops sending for the server's `Retry-After` after a 429, masks
filter keys at any depth and reports `cause` chains. The server release
defaults to `ERRORGAP_RELEASE`, the hosting platform's commit variable or the
git checkout. Uncaught server errors are reported and the exit is left to
Nitro.

## Browser performance

```ts
export default defineNuxtConfig({
  modules: ["@errorgap/nuxt"],
  errorgap: {
    // …connection options…
    performance: { sampleRate: 0.25 },
  },
});
```

Measures page loads, client-side navigations, Core Web Vitals and fetch/XHR
calls (Errorgap → Performance → Browser). Timings are grouped by the matched
route pattern (`/orders/:id`), not the URL.

## Session replay

The browser records session replay (shown on error groups and incidents in
Errorgap): a timeline of page loads, route changes, failed API calls, errors and
rage clicks, plus masked page snapshots. Whether a session is recorded follows
the project's settings in Errorgap (**Settings → Session replay**). Snapshots
blank every form field; mark anything else to keep out with `data-errorgap-block`
(removed) or `data-errorgap-mask` (text masked). See
[`@errorgap/browser`](https://github.com/errorgaphq/errorgap-js#session-replay).

## Manual reporting

```vue
<script setup lang="ts">
const errorgap = useErrorgap();

async function save() {
  try {
    await risky();
  } catch (error) {
    await errorgap.notify(error, { context: { component: "SaveButton" } });
  }
}
</script>
```

`useErrorgap().notify` works in both client and server contexts.

## License

MIT.

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
| `captureGlobals` | `true` | Install window/process handlers |
| `performance` | `false` | `true` or `{ sampleRate, trackRequests, flushIntervalMs }` — browser page loads, navigations, Core Web Vitals and API calls, grouped by Vue Router's matched route |

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

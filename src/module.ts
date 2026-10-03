import { addImportsSources, addPlugin, addServerPlugin, createResolver, defineNuxtModule } from "@nuxt/kit";
import { defu } from "defu";
import { VERSION } from "./version";

export interface ModuleOptions {
  /** Errorgap ingestion base URL, e.g. `https://errorgap.example.com`. */
  endpoint?: string;
  /** Errorgap project slug. Notices go to `/api/projects/{slug}/notices`. */
  projectSlug?: string;
  projectId?: string;
  /**
   * Project ingestion key, sent as `x-errorgap-project-key`. It can only submit
   * notices (not read data), so — like a Sentry DSN — it is included in the
   * client bundle when client capture is enabled.
   */
  apiKey?: string;
  /** Defaults to Nuxt's `NODE_ENV` / "production". */
  environment?: string;
  release?: string;
  /** Fraction (0..1) of captured errors to report. Defaults to 1. */
  sampleRate?: number;
  /** Resolve client stack frames through deployed source maps. Defaults to true. */
  sourceMaps?: boolean;
  /** Capture client-side (browser/Vue) errors. Defaults to true. */
  client?: boolean;
  /** Capture server-side (Nitro) errors. Defaults to true. */
  server?: boolean;
  /** Install global window / process handlers. Defaults to true. */
  captureGlobals?: boolean;
  /**
   * Measure page loads, client-side navigations, Core Web Vitals and fetch/XHR
   * calls in the browser (Errorgap → Performance → Browser). Routes are named
   * from Vue Router's matched route (`/orders/:id`). Off by default.
   */
  performance?: boolean | PerformanceSettings;
}

/** Serializable browser-performance settings (they travel in runtimeConfig). */
export interface PerformanceSettings {
  /** Share of page loads measured, 0–1. Defaults to 1. */
  sampleRate?: number;
  /** Time fetch and XHR calls. Defaults to true. */
  trackRequests?: boolean;
  /** How often batches are sent, in ms. Defaults to 10 000. */
  flushIntervalMs?: number;
}

/** Client-safe options mirrored into `runtimeConfig.public.errorgap`. */
export interface PublicErrorgapConfig {
  endpoint?: string;
  projectSlug?: string;
  projectId?: string;
  apiKey?: string;
  environment?: string;
  release?: string;
  sampleRate?: number;
  sourceMaps?: boolean;
  client?: boolean;
  captureGlobals?: boolean;
  performance?: boolean | PerformanceSettings;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@errorgap/nuxt",
    configKey: "errorgap",
    version: VERSION,
    compatibility: { nuxt: ">=3.0.0" },
  },
  defaults: {
    sampleRate: 1,
    sourceMaps: true,
    client: true,
    server: true,
    captureGlobals: true,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // Client-safe config: exposed to the browser bundle. Never includes the key.
    const publicConfig: PublicErrorgapConfig = {
      endpoint: options.endpoint,
      projectSlug: options.projectSlug,
      projectId: options.projectId,
      // Ingestion-only key (see ModuleOptions.apiKey) — safe in the client bundle.
      apiKey: options.apiKey,
      environment: options.environment,
      release: options.release,
      sampleRate: options.sampleRate,
      sourceMaps: options.sourceMaps,
      client: options.client,
      captureGlobals: options.captureGlobals,
      performance: options.performance,
    };
    nuxt.options.runtimeConfig.public.errorgap = defu(
      nuxt.options.runtimeConfig.public.errorgap as PublicErrorgapConfig,
      publicConfig,
    );

    nuxt.options.runtimeConfig.errorgap = defu(
      nuxt.options.runtimeConfig.errorgap as { server?: boolean },
      { server: options.server },
    );

    if (options.client !== false) {
      addPlugin({ src: resolver.resolve("./runtime/plugin.client"), mode: "client" });
    }

    if (options.server !== false) {
      addServerPlugin(resolver.resolve("./runtime/nitro"));
    }

    // Auto-import `useErrorgap()` for manual reporting.
    addImportsSources({
      from: resolver.resolve("./runtime/composables"),
      imports: ["useErrorgap"],
    });
  },
});

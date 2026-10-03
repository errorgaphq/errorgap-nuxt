import { Errorgap } from "@errorgap/browser";
// @ts-expect-error -- #imports is resolved by Nuxt at app build time.
import { defineNuxtPlugin, useRuntimeConfig } from "#imports";
import { routeContext, routeTemplate, type RouteLike } from "./context";
import type { PublicErrorgapConfig } from "../module";

export default defineNuxtPlugin((nuxtApp: NuxtAppLike) => {
  const config = (useRuntimeConfig().public.errorgap ?? {}) as PublicErrorgapConfig;
  if (config.client === false || !config.endpoint || !config.projectSlug) {
    return;
  }

  Errorgap.init({
    endpoint: config.endpoint,
    projectSlug: config.projectSlug,
    projectId: config.projectId,
    apiKey: config.apiKey,
    environment: config.environment,
    release: config.release,
    sampleRate: config.sampleRate,
    sourceMaps: config.sourceMaps,
    captureGlobals: config.captureGlobals ?? true,
    performance: config.performance
      ? {
          ...(config.performance === true ? {} : config.performance),
          routeName: () => routeTemplate(nuxtApp.$router?.currentRoute?.value),
        }
      : false,
  });

  // Vue render/lifecycle errors surfaced by Nuxt.
  nuxtApp.hook("vue:error", (error: unknown, _instance: unknown, info: string) => {
    void Errorgap.notify(error, {
      context: { source: "nuxt.vue:error", lifecycle_hook: info, ...currentRouteContext(nuxtApp) },
    });
  });

  // Fatal app-level errors (e.g. thrown in plugins or during hydration).
  nuxtApp.hook("app:error", (error: unknown) => {
    void Errorgap.notify(error, {
      context: { source: "nuxt.app:error", ...currentRouteContext(nuxtApp) },
    });
  });
});

interface NuxtAppLike {
  hook(name: string, fn: (...args: never[]) => unknown): void;
  $router?: { currentRoute?: { value?: RouteLike } };
}

function currentRouteContext(nuxtApp: NuxtAppLike): Record<string, unknown> {
  return routeContext(nuxtApp.$router?.currentRoute?.value);
}

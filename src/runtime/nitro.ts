import { Errorgap } from "@errorgap/node";
// @ts-expect-error -- #imports is resolved by Nitro at app build time.
import { defineNitroPlugin, useRuntimeConfig } from "#imports";
import { eventContext, type EventLike, unwrapNitroError } from "./context";
import type { PublicErrorgapConfig } from "../module";

export default defineNitroPlugin((nitroApp: NitroAppLike) => {
  const runtimeConfig = useRuntimeConfig() as {
    public?: { errorgap?: PublicErrorgapConfig };
    errorgap?: { server?: boolean };
  };
  const pub = runtimeConfig.public?.errorgap ?? {};
  const priv = runtimeConfig.errorgap ?? {};
  if (priv.server === false || !pub.endpoint || !pub.projectSlug) {
    return;
  }

  Errorgap.init({
    endpoint: pub.endpoint,
    projectSlug: pub.projectSlug,
    projectId: pub.projectId,
    apiKey: pub.apiKey,
    environment: pub.environment,
    release: pub.release,
    sampleRate: pub.sampleRate,
    captureGlobals: pub.captureGlobals ?? true,
  });

  // Nitro reports every unhandled request error through this hook.
  nitroApp.hooks.hook("error", (error: unknown, meta?: { event?: EventLike }) => {
    const { context, environment } = eventContext(meta?.event);
    void Errorgap.notify(unwrapNitroError(error), { context, environment });
  });
});

interface NitroAppLike {
  hooks: { hook(name: string, fn: (...args: never[]) => unknown): void };
}

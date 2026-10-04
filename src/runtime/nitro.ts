import { Errorgap, browserTraceId, newTransactionId } from "@errorgap/node";
// @ts-expect-error -- #imports is resolved by Nitro at app build time.
import { defineNitroPlugin, useRuntimeConfig } from "#imports";
import {
  eventContext,
  type EventLike,
  type RequestTransactionState,
  serverRoute,
  traceHeader,
  unwrapNitroError,
} from "./context";
import type { PublicErrorgapConfig } from "../module";

export default defineNitroPlugin((nitroApp: NitroAppLike) => {
  const runtimeConfig = useRuntimeConfig() as {
    public?: { errorgap?: PublicErrorgapConfig };
    errorgap?: { server?: boolean; apm?: boolean; apmSampleRate?: number };
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
    apmEnabled: priv.apm === true,
    // runtimeConfig turns unset options into "", so only pass a real number.
    apmSampleRate: typeof priv.apmSampleRate === "number" ? priv.apmSampleRate : undefined,
  });

  // Each server request is an APM transaction (sent with `apm: true`). Its id
  // goes on errors Nitro reports for the request, and the browser SDK's
  // x-errorgap-trace header links the browser's view of the call to it.
  nitroApp.hooks.hook("request", (event: EventLike) => {
    if (!event.context) return;
    const state: RequestTransactionState = {
      id: newTransactionId(),
      startedAt: new Date().toISOString(),
      start: performance.now(),
    };
    event.context.errorgap = state;

    // Recorded when the response finishes: h3 skips the afterResponse hook
    // when a handler throws, but the Node response always finishes or closes.
    let recorded = false;
    const record = () => {
      if (recorded) return;
      recorded = true;
      const path = event.path ?? event.node?.req?.url ?? "/";
      void Errorgap.notifyTransaction({
        id: state.id,
        traceId: browserTraceId(traceHeader(event)),
        kind: "web",
        method: event.method ?? event.node?.req?.method,
        path: serverRoute(event),
        pathRaw: path.split("?")[0],
        statusCode: event.node?.res?.statusCode,
        durationMs: performance.now() - state.start,
        occurredAt: state.startedAt,
      });
    };
    event.node?.res?.once?.("finish", record);
    event.node?.res?.once?.("close", record);
  });

  // Nitro reports every unhandled request error through this hook.
  nitroApp.hooks.hook("error", (error: unknown, meta?: { event?: EventLike }) => {
    const { context, environment } = eventContext(meta?.event);
    const state = meta?.event?.context?.errorgap as RequestTransactionState | undefined;
    if (state) context.transaction_id = state.id;
    void Errorgap.notify(unwrapNitroError(error), { context, environment });
  });
});

interface NitroAppLike {
  hooks: { hook(name: string, fn: (...args: never[]) => unknown): void };
}

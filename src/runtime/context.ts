// Pure context helpers shared by the client and server runtime plugins. Kept
// framework-object-free so they can be unit tested without a Nuxt runtime.

export interface RouteLike {
  fullPath?: string;
  path?: string;
  name?: unknown;
  matched?: Array<{ path?: string }>;
}

/**
 * The route pattern browser timings are grouped by: Vue Router's matched
 * record path, with Nuxt's `()` param suffixes dropped (`/orders/:id()` →
 * `/orders/:id`). Undefined before a route has matched.
 */
export function routeTemplate(route: RouteLike | null | undefined): string | undefined {
  const matched = route?.matched;
  const path = matched && matched.length > 0 ? matched[matched.length - 1]?.path : undefined;
  if (!path) return undefined;
  return path.replace(/\(\)/g, "");
}

export interface EventLike {
  path?: string;
  method?: string;
  node?: { req?: { method?: string; url?: string; headers?: Record<string, unknown> } };
}

/** Error context for a client-side (browser) notice from the active route. */
export function routeContext(route: RouteLike | null | undefined): Record<string, unknown> {
  if (!route) return {};
  const path = route.fullPath ?? route.path;
  const context: Record<string, unknown> = {};
  if (path) context.url = path;
  const component = typeof route.name === "string" && route.name.length > 0 ? route.name : route.path;
  if (component) context.component = component;
  return context;
}

/** Context + environment for a server-side (Nitro) notice from an H3 event. */
export function eventContext(event: EventLike | null | undefined): {
  context: Record<string, unknown>;
  environment: Record<string, unknown>;
} {
  if (!event) return { context: {}, environment: {} };
  const method = event.method ?? event.node?.req?.method;
  const path = event.path ?? event.node?.req?.url;

  const context: Record<string, unknown> = { source: "nitro.error" };
  if (path) context.url = path;
  if (method) context.action = method;

  const environment: Record<string, unknown> = {};
  if (method) environment.method = method;
  if (path) environment.path = stripQuery(path);

  return { context, environment };
}

function stripQuery(path: string): string {
  const index = path.indexOf("?");
  return index === -1 ? path : path.slice(0, index);
}

/**
 * Nitro wraps an unhandled handler error in an H3Error (statusCode 500,
 * `name: "Error"`) and stores the original under `cause`. Report the underlying
 * error so its real type, message, and stack survive instead of a generic
 * "Error". H3Errors created intentionally (e.g. `createError`) have no such
 * cause and are reported as-is.
 */
export function unwrapNitroError(error: unknown): unknown {
  const wrapper = error as { cause?: unknown } | null;
  if (wrapper && typeof wrapper === "object" && wrapper.cause instanceof Error && isH3Error(wrapper)) {
    return wrapper.cause;
  }
  return error;
}

// H3Error marks the class with a static `__h3_error__` flag (not an instance
// property), so detect it through the constructor.
function isH3Error(error: object): boolean {
  const ctor = (error as { constructor?: { __h3_error__?: boolean; name?: string } }).constructor;
  return ctor?.__h3_error__ === true || ctor?.name === "H3Error";
}

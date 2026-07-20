import { describe, expect, it } from "vitest";
import { eventContext, routeContext, unwrapNitroError } from "../src/runtime/context";

describe("routeContext", () => {
  it("uses the full path and a named route as the component", () => {
    expect(routeContext({ fullPath: "/orders/7?tab=items", path: "/orders/7", name: "orders-id" })).toEqual({
      url: "/orders/7?tab=items",
      component: "orders-id",
    });
  });

  it("falls back to the path when the route has no name", () => {
    expect(routeContext({ path: "/checkout" })).toEqual({ url: "/checkout", component: "/checkout" });
  });

  it("returns an empty object for a missing route", () => {
    expect(routeContext(null)).toEqual({});
    expect(routeContext(undefined)).toEqual({});
  });
});

describe("eventContext", () => {
  it("extracts method/path from a top-level H3 event and strips the query", () => {
    expect(eventContext({ method: "POST", path: "/api/orders?debug=1" })).toEqual({
      context: { source: "nitro.error", url: "/api/orders?debug=1", action: "POST" },
      environment: { method: "POST", path: "/api/orders" },
    });
  });

  it("falls back to the node request when method/path are absent", () => {
    expect(eventContext({ node: { req: { method: "GET", url: "/api/health" } } })).toEqual({
      context: { source: "nitro.error", url: "/api/health", action: "GET" },
      environment: { method: "GET", path: "/api/health" },
    });
  });

  it("returns empty context for a missing event", () => {
    expect(eventContext(undefined)).toEqual({ context: {}, environment: {} });
  });
});

describe("unwrapNitroError", () => {
  // H3Error marks the class with a static flag, mirrored here.
  class FakeH3Error extends Error {
    static __h3_error__ = true;
    statusCode = 500;
  }

  it("unwraps an H3Error to its underlying cause", () => {
    const cause = new TypeError("real error");
    const h3Error = Object.assign(new FakeH3Error("Internal Server Error"), { cause });
    expect(unwrapNitroError(h3Error)).toBe(cause);
  });

  it("returns an H3Error without a cause as-is", () => {
    const h3Error = new FakeH3Error("Not Found");
    expect(unwrapNitroError(h3Error)).toBe(h3Error);
  });

  it("returns a plain error untouched", () => {
    const error = new Error("plain");
    expect(unwrapNitroError(error)).toBe(error);
  });
});

import type { NoticeContext } from "@errorgap/browser";

export interface UseErrorgap {
  /**
   * Report an error to Errorgap manually. Routes to the server (`@errorgap/node`)
   * or client (`@errorgap/browser`) notifier depending on where it runs.
   */
  notify(error: unknown, options?: NoticeContext & { sync?: boolean }): Promise<{ status?: number; error?: unknown }>;
}

export function useErrorgap(): UseErrorgap {
  return {
    async notify(error, options = {}) {
      // Dynamic import + import.meta.server guard keeps the Node notifier out of
      // the client bundle and vice versa.
      if (import.meta.server) {
        const { Errorgap } = await import("@errorgap/node");
        return Errorgap.notify(error, options);
      }
      const { Errorgap } = await import("@errorgap/browser");
      return Errorgap.notify(error, options);
    },
  };
}

export {};

declare global {
  interface Window {
    __pladeplanCloud?: {
      signedIn: boolean;
      ready: boolean;
      degraded?: boolean;
      warned?: boolean;
      authAvailable?: boolean;
      /** Free-plan cap. null or omitted means unlimited (billing off, Pro, or guest). */
      saveLimit?: number | null;
      /** Development-only preview. Skips the account fetch. */
      preview?: boolean;
      previousCache?: Array<Record<string, unknown>>;
      cache: Array<Record<string, unknown>>;
      push?: (all: Array<Record<string, unknown>>) => void;
    };
    __pladeplanOnAuth?: () => Promise<void> | void;
  }
}

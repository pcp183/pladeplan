export {};

declare global {
  interface Window {
    __pladeplanCloud?: {
      signedIn: boolean;
      ready: boolean;
      degraded?: boolean;
      warned?: boolean;
      authAvailable?: boolean;
      cache: Array<Record<string, unknown>>;
      push?: (all: Array<Record<string, unknown>>) => void;
    };
    __pladeplanOnAuth?: () => Promise<void> | void;
    __pladeplanOpenPhoto?: () => void;
    __pladeplanReplaceParts?: (
      parts: Array<{ name: string; w: number; h: number; q: number }>,
      name?: string,
    ) => boolean;
  }
}

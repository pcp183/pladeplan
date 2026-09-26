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
  }
}

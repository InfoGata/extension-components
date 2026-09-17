const SUPPRESS_KEY = "infogata:no-extension";
const SUPPRESS_PARAM = "noextension";

const offValues = ["0", "false", "off"];

/**
 * sessionStorage throws rather than returning null in some privacy modes, and
 * is absent outside a browser, so every access is guarded. A store that cannot
 * answer means "not suppressed", the same as an empty one.
 */
const readStore = (): string | null => {
  try {
    return window.sessionStorage.getItem(SUPPRESS_KEY);
  } catch {
    return null;
  }
};

const writeStore = (suppressed: boolean): void => {
  try {
    if (suppressed) {
      window.sessionStorage.setItem(SUPPRESS_KEY, "1");
    } else {
      window.sessionStorage.removeItem(SUPPRESS_KEY);
    }
  } catch {
    // A tab that cannot store the choice still honours it for this page load,
    // because the address is read on every call.
  }
};

/**
 * Reads `?noextension` and remembers it for the tab, so the choice survives the
 * app rewriting the address and any later reload. `?noextension=0` clears it.
 * Returns whether the current page should act as if no extension is installed.
 */
export const isExtensionSuppressed = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  let param: string | null = null;
  try {
    param = new URLSearchParams(window.location.search).get(SUPPRESS_PARAM);
  } catch {
    param = null;
  }

  if (param !== null) {
    const suppressed = !offValues.includes(param.toLowerCase());
    writeStore(suppressed);
    return suppressed;
  }

  return readStore() !== null;
};

/**
 * True when the InfoGata extension has injected itself into this page.
 *
 * Polled on an interval, so it can be called after the DOM it reads is gone --
 * in tests, once the environment has been torn down. A bare `window` throws
 * ReferenceError there, and inside a timer that is an uncaught exception.
 *
 * Suppression is deliberately honoured in production builds too: it only ever
 * takes capabilities away from the page, and it is the only way to exercise the
 * no-extension path against a deployed site.
 */
export const hasExtension = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  if (isExtensionSuppressed()) {
    return false;
  }
  // Indexed rather than `window.InfoGata`: consumers declare that global with
  // their own type, and a declaration here would collide with theirs.
  return (window as unknown as Record<string, unknown>)["InfoGata"] !== undefined;
};

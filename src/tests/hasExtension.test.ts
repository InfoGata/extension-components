// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { hasExtension, isExtensionSuppressed } from "../hasExtension";

const SUPPRESS_KEY = "infogata:no-extension";

const setUrl = (url: string) => {
  window.history.replaceState(null, "", url);
};

const setSearch = (search: string) => setUrl(`/${search}`);

const installExtension = () => {
  (window as unknown as Record<string, unknown>).InfoGata = {
    networkRequest: () => undefined,
  };
};

beforeEach(() => {
  setSearch("");
  window.sessionStorage.clear();
  delete (window as unknown as Record<string, unknown>).InfoGata;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hasExtension", () => {
  it("is false when the extension has not injected itself", () => {
    expect(hasExtension()).toBe(false);
  });

  it("is true once the extension is there", () => {
    installExtension();
    expect(hasExtension()).toBe(true);
  });

  it("is false with ?noextension even when the extension is there", () => {
    installExtension();
    setSearch("?noextension");
    expect(hasExtension()).toBe(false);
  });
});

describe("isExtensionSuppressed", () => {
  it("is false without the parameter", () => {
    expect(isExtensionSuppressed()).toBe(false);
  });

  it("holds for the tab after the parameter is gone", () => {
    setSearch("?noextension");
    expect(isExtensionSuppressed()).toBe(true);

    // What the app does once it takes over the address
    setUrl("/s/lobsters/feed");
    expect(isExtensionSuppressed()).toBe(true);
    expect(window.sessionStorage.getItem(SUPPRESS_KEY)).toBe("1");
  });

  it("is cleared by ?noextension=0", () => {
    setSearch("?noextension");
    expect(isExtensionSuppressed()).toBe(true);

    setSearch("?noextension=0");
    expect(isExtensionSuppressed()).toBe(false);
    expect(window.sessionStorage.getItem(SUPPRESS_KEY)).toBe(null);
    setSearch("");
    expect(isExtensionSuppressed()).toBe(false);
  });

  it("treats off values as cleared", () => {
    for (const value of ["0", "false", "off", "FALSE"]) {
      setSearch("?noextension");
      setSearch(`?noextension=${value}`);
      expect(isExtensionSuppressed()).toBe(false);
    }
  });

  it("honours the parameter when sessionStorage throws", () => {
    vi.spyOn(window.sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(window.sessionStorage, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });

    setSearch("?noextension");
    expect(isExtensionSuppressed()).toBe(true);

    // Nothing was stored, so the next page load without the parameter forgets
    setSearch("");
    expect(isExtensionSuppressed()).toBe(false);
  });
});

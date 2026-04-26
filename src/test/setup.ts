import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement Element.scrollIntoView — provide a no-op stub
if (!("scrollIntoView" in Element.prototype)) {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    writable: true,
    value: () => {},
  });
}

// jsdom doesn't implement ResizeObserver — provide a no-op stub
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom doesn't implement window.matchMedia — provide a minimal stub
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

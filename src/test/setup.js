import '@testing-library/jest-dom';

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserverMock {
    constructor(callback) { this.callback = callback; }
    observe(target) { this.callback([{ target, contentRect: { width: 720, height: 260 } }]); }
    unobserve() {}
    disconnect() {}
  };
}

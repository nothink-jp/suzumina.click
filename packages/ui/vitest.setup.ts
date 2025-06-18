import "@testing-library/jest-dom";

// Mocks for Web Audio API  
declare global {
  var AudioContext: any;
  var webkitAudioContext: any;
}

global.AudioContext = class AudioContext {};
global.webkitAudioContext = class webkitAudioContext {};

// Mock for ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock for IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock for matchMedia
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
    dispatchEvent: () => {},
  }),
});

/**
 * Mise en place commune des tests du front : ce que jsdom ne fournit pas et que l'application utilise
 * (ResizeObserver pour l'aperçu du CV, matchMedia pour « réduire les animations », scrollIntoView).
 */
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import i18n from '../i18n';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
}

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? function scrollIntoView() {};
window.scrollTo = (() => {}) as typeof window.scrollTo;

// Interface en français, comme pour un étudiant (jsdom annonce un navigateur en anglais).
void i18n.changeLanguage('fr');

afterEach(() => {
  cleanup();
  localStorage.clear();
});

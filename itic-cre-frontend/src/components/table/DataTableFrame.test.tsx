/**
 * Lot 11 : carte des tableaux. Le défilement infini garde le bon repère : sur mobile, la page (<main>) défile et la
 * carte ne défile qu'en largeur ; à partir de md, c'est la carte qui défile (en-tête accroché).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DataTableFrame from './DataTableFrame';
import InfiniteScrollSentinel from '../shared/InfiniteScrollSentinel';

const roots: (Element | Document | null | undefined)[] = [];
class IntersectionObserverSpy {
    constructor(_cb: IntersectionObserverCallback, options?: IntersectionObserverInit) { roots.push(options?.root); }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
}
vi.stubGlobal('IntersectionObserver', IntersectionObserverSpy);

function mediaQuery(mdUp: boolean) {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
        matches: mdUp, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {},
        dispatchEvent: () => false,
    }) as MediaQueryList);
}

function renderFrame() {
    return render(
        <main style={{ overflowY: 'auto' }}>
            <DataTableFrame
                label="Tableau d’essai"
                footer={<InfiniteScrollSentinel hasMore isLoadingMore={false} onLoadMore={() => {}} />}
            >
                <table><tbody><tr><td>Marie-Charlotte DUPONT-LEFEBVRE</td></tr></tbody></table>
            </DataTableFrame>
        </main>,
    );
}

afterEach(() => { roots.length = 0; });

describe('carte des tableaux : défilement infini', () => {
    it('mobile : la carte ne défile qu’en largeur, la sentinelle suit la page (<main>)', () => {
        mediaQuery(false);
        const { container } = renderFrame();
        const region = screen.getByRole('region', { name: 'Tableau d’essai' });
        expect(region.style.overflowY).toBe('hidden');
        expect(roots.at(-1)).toBe(container.querySelector('main'));
    });

    it('à partir de md : la carte défile (hauteur calée sur la fenêtre), la sentinelle la suit', () => {
        mediaQuery(true);
        renderFrame();
        const region = screen.getByRole('region', { name: 'Tableau d’essai' });
        expect(region.style.overflowY).toBe('auto');
        expect(region.style.maxHeight).not.toBe('');
        expect(roots.at(-1)).toBe(region);
    });
});

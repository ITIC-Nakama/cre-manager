/**
 * Lot 10 (A) : adresse postale. Validation (mêmes règles que le serveur), ville proposée par geo.api.gouv.fr
 * (simulée), repli silencieux si l'API ne répond pas, bandeau « Complète ton adresse », formulaire d'inscription.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddressFields from './AddressFields';
import AddressBanner from '../student/AddressBanner';
import RegisterPage from '../../pages/auth/RegisterPage';
import { useAddressForm } from '../../hooks/useAddressForm';
import { EMPTY_ADDRESS, lookupCities, serverAddressErrors, validateAddress } from '../../utils/address';
import { csvCell } from '../../utils/csvExport';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

function wrap(ui: React.ReactElement) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}

/** Banc d'essai : la section Adresse avec son état (validation en direct). */
function Harness() {
    const address = useAddressForm(EMPTY_ADDRESS);
    const [sent, setSent] = useState(false);
    return (
        <form onSubmit={(e) => { e.preventDefault(); setSent(address.submit()); }}>
            <AddressFields value={address.value} onChange={address.setValue} errors={address.errors} onBlurField={address.touch} />
            <button type="submit">Envoyer</button>
            {sent && <p>adresse valide</p>}
        </form>
    );
}

const fetchMock = vi.fn();

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function cities(names: string[]) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(names.map((nom) => ({ nom }))) });
}

describe('validation de l’adresse', () => {
    it('rue, code postal à 5 chiffres et ville obligatoires ; plus de champ « Complément »', () => {
        expect(validateAddress(EMPTY_ADDRESS)).toEqual({
            addressLine1: 'ADDRESS_LINE1_REQUIRED', postalCode: 'POSTAL_CODE_REQUIRED', city: 'CITY_REQUIRED',
        });
        const ok = { addressLine1: ' 12 rue X ', postalCode: '75011', city: 'Paris' };
        expect(validateAddress(ok)).toEqual({});
        for (const bad of ['7501', '750111', '75O11', '75 11']) {
            expect(validateAddress({ ...ok, postalCode: bad }).postalCode).toBe('POSTAL_CODE_INVALID');
        }
        expect(validateAddress({ ...ok, addressLine1: '   ' }).addressLine1).toBe('ADDRESS_LINE1_REQUIRED');
        expect(serverAddressErrors({ postalCode: 'POSTAL_CODE_INVALID', email: 'autre' })).toEqual({ postalCode: 'POSTAL_CODE_INVALID' });
    });

    it('le formulaire n’affiche pas de champ « Complément »', () => {
        fetchMock.mockReturnValue(cities([]));
        render(<Harness />);
        expect(screen.getByLabelText(/N° et rue/)).toBeTruthy();
        expect(screen.queryByLabelText(/Complément/)).toBeNull();
        expect(document.querySelector('[autocomplete="address-line2"]')).toBeNull();
    });

    it('erreurs en direct : affichées quand on quitte un champ vide, toutes à l’envoi, avec les messages du serveur', async () => {
        fetchMock.mockReturnValue(cities([]));
        render(<Harness />);
        fireEvent.blur(screen.getByLabelText(/N° et rue/));
        expect(screen.getByText('Indique ton numéro et ta rue.')).toBeTruthy();
        expect(screen.queryByText('Indique ta ville.')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
        expect(screen.getByText('Indique ton code postal.')).toBeTruthy();
        expect(screen.getByText('Indique ta ville.')).toBeTruthy();
        expect(screen.queryByText('adresse valide')).toBeNull();
    });
});

describe('aide au code postal (geo.api.gouv.fr simulée)', () => {
    it('une seule ville : préremplie, et reste modifiable', async () => {
        fetchMock.mockReturnValue(cities(['Saint-Denis']));
        render(<Harness />);
        fireEvent.change(screen.getByLabelText(/Code postal/), { target: { value: '93200' } });
        await flush();
        expect(fetchMock).toHaveBeenCalledWith('https://geo.api.gouv.fr/communes?codePostal=93200&fields=nom', expect.anything());
        const city = screen.getByLabelText(/Ville/) as HTMLInputElement;
        expect(city.value).toBe('Saint-Denis');
        fireEvent.change(city, { target: { value: 'Saint-Denis (93)' } });
        expect((screen.getByLabelText(/Ville/) as HTMLInputElement).value).toBe('Saint-Denis (93)');
        fireEvent.change(screen.getByLabelText(/N° et rue/), { target: { value: '1 rue Fictive' } });
        fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
        expect(screen.getByText('adresse valide')).toBeTruthy();
    });

    it('plusieurs villes : liste de choix', async () => {
        fetchMock.mockReturnValue(cities(['Villeneuve-la-Garenne', 'Gennevilliers']));
        render(<Harness />);
        fireEvent.change(screen.getByLabelText(/Code postal/), { target: { value: '92230' } });
        await flush();
        const select = screen.getByLabelText(/Ville/) as HTMLSelectElement;
        expect(select.tagName).toBe('SELECT');
        expect(Array.from(select.options).map((o) => o.textContent))
            .toEqual(['Choisis ta ville', 'Gennevilliers', 'Villeneuve-la-Garenne', 'Autre ville…']);
        fireEvent.change(select, { target: { value: 'Gennevilliers' } });
        expect((screen.getByLabelText(/Ville/) as HTMLSelectElement).value).toBe('Gennevilliers');
        // Commune absente de la liste : « Autre ville… » rouvre la saisie libre.
        fireEvent.change(screen.getByLabelText(/Ville/), { target: { value: '__other__' } });
        const free = screen.getByLabelText(/Ville/) as HTMLInputElement;
        expect(free.tagName).toBe('INPUT');
        fireEvent.change(free, { target: { value: 'Villeneuve' } });
        expect((screen.getByLabelText(/Ville/) as HTMLInputElement).value).toBe('Villeneuve');
    });

    it('ville proposée puis code postal changé pour plusieurs communes : la ville proposée s’efface, la liste s’affiche', async () => {
        fetchMock.mockImplementation((url: string) => cities(url.includes('93200') ? ['Saint-Denis'] : ['Gennevilliers', 'Villeneuve-la-Garenne']));
        render(<Harness />);
        fireEvent.change(screen.getByLabelText(/Code postal/), { target: { value: '93200' } });
        await flush();
        expect((screen.getByLabelText(/Ville/) as HTMLInputElement).value).toBe('Saint-Denis');
        fireEvent.change(screen.getByLabelText(/Code postal/), { target: { value: '92230' } });
        await flush();
        const select = screen.getByLabelText(/Ville/) as HTMLSelectElement;
        expect(select.tagName).toBe('SELECT');
        expect(select.value).toBe('');
    });

    it('API muette ou bloquée : aucune erreur affichée, la ville se tape à la main', async () => {
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
        render(<Harness />);
        fireEvent.change(screen.getByLabelText(/Code postal/), { target: { value: '75011' } });
        await flush();
        const city = screen.getByLabelText(/Ville/) as HTMLInputElement;
        expect(city.tagName).toBe('INPUT');
        expect(city.value).toBe('');
        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.queryByText(/erreur/i)).toBeNull();
        fireEvent.change(city, { target: { value: 'Paris' } });
        expect((screen.getByLabelText(/Ville/) as HTMLInputElement).value).toBe('Paris');
        await expect(lookupCities('75011')).resolves.toEqual([]);
        fetchMock.mockReturnValue(Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));
        await expect(lookupCities('75011')).resolves.toEqual([]);
        await expect(lookupCities('7501')).resolves.toEqual([]);
    });
});

describe('bandeau « Complète ton adresse »', () => {
    it('affiché tant que l’adresse est incomplète, avec un lien vers le bloc Adresse ; absent une fois enregistrée', async () => {
        api.get.mockResolvedValue({ data: { data: { addressLine1: null, postalCode: '93200', city: null, complete: false } } });
        const first = wrap(<AddressBanner />);
        expect(await screen.findByText('Complète ton adresse : elle est maintenant demandée pour ton dossier.')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Compléter mon adresse' }).getAttribute('href')).toBe('/student/parametres#adresse');
        first.unmount();

        api.get.mockResolvedValue({ data: { data: { addressLine1: '1 rue X', postalCode: '93200', city: 'Saint-Denis', complete: true } } });
        wrap(<AddressBanner />);
        await flush();
        expect(screen.queryByText(/Complète ton adresse/)).toBeNull();
    });
});

describe('inscription', () => {
    it('section Adresse obligatoire : sans adresse, erreurs affichées et rien n’est envoyé ; phrase de confidentialité', async () => {
        api.get.mockResolvedValue({ data: { data: [] } });
        fetchMock.mockReturnValue(cities([]));
        wrap(<RegisterPage />);
        await flush();
        expect(screen.getByText(/Seuls toi, ton conseiller et l’équipe ITIC la voient/)).toBeTruthy();
        expect((screen.getByLabelText(/Code postal/) as HTMLInputElement).inputMode).toBe('numeric');
        fireEvent.submit(screen.getByLabelText(/N° et rue/).closest('form')!);
        await flush();
        expect(screen.getByText('Indique ton numéro et ta rue.')).toBeTruthy();
        expect(screen.getByText('Indique ton code postal.')).toBeTruthy();
        expect(screen.getByText('Indique ta ville.')).toBeTruthy();
        expect(api.post).not.toHaveBeenCalled();
    });
});

describe('export CSV de l’équipe', () => {
    it('une adresse saisie comme une formule Excel est neutralisée (apostrophe), le reste inchangé', () => {
        expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
        for (const start of ['+', '-', '@']) expect(csvCell(`${start}1`)).toBe(`"'${start}1"`);
        expect(csvCell('12 rue de la Paix')).toBe('"12 rue de la Paix"');
        expect(csvCell(null)).toBe('""');
    });
});

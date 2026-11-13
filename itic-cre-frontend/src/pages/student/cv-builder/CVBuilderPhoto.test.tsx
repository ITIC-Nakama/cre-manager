/**
 * Photo du CV dans l'assistant (demande ITIC du 13/11/2026) : photo de profil par défaut (case cochée), « Ajouter une
 * photo » sans photo, « Changer la photo » (JPEG ou PNG, 5 Mo maximum, puis recadrage), « Revenir à ma photo de
 * profil ». Les noms des modèles portent « (optimisé ATS) ».
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StudentCVPage from '../cv/StudentCVPage';
import type { CvDraftResponse, CvPhotoInfo, CvTemplateCode } from '../../../types/models/CVBuilder';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

function draft(photo: CvPhotoInfo | undefined, afficherPhoto: boolean, templateCode: CvTemplateCode = 'CLASSIQUE'): CvDraftResponse {
  return {
    data: {
      identite: {
        prenom: 'Nora', nom: 'Petitjean', titre: '', email: 'nora.petitjean@example.com', telephone: '0600000000',
        ville: '', mobilite: '', liens: [], afficherPhoto,
      },
      accroche: '', experiences: [], formations: [], projets: [],
      competences: { techniques: [], outils: [], savoirEtre: [] },
      langues: [], certifications: [], centresInteret: [],
      ordreSections: ['formations', 'experiences', 'projets', 'competences', 'langues', 'certifications', 'centresInteret'],
      ordrePersonnalise: false, sectionsMasquees: [],
    },
    templateCode, accentColor: '#3B71FF', cvLang: 'fr', version: 2, saved: true,
    updatedAt: '2026-11-13T10:00:00Z', lastSubmittedAt: null, photo,
  };
}

function serve(response: CvDraftResponse) {
  api.get.mockImplementation((url: string) => {
    if (url === '/cv/me') return Promise.resolve({ status: 204, data: '' });
    if (url === '/cv/builder/me') return Promise.resolve({ data: { data: response } });
    if (url === '/cv/builder/me/score') return Promise.resolve({ data: { data: { score: 40, pageCount: 1, tips: [] } } });
    if (url === '/cv/builder/me/photo') return Promise.resolve({ status: 200, data: new Blob(['jpeg'], { type: 'image/jpeg' }) });
    return Promise.reject({ response: { status: 500 } });
  });
  api.post.mockImplementation((url: string) => {
    if (url === '/cv/builder/me/preview') return Promise.resolve({ data: '<html><body>Aperçu du CV</body></html>' });
    if (url === '/cv/builder/me/photo') {
      return Promise.resolve({ data: { data: { source: 'CV', profilePhotoAvailable: false, key: 'nouvelle' } } });
    }
    return Promise.reject({ response: { status: 500 } });
  });
  api.put.mockImplementation(() => Promise.resolve({ data: { data: response } }));
}

async function renderBuilder() {
  const client = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/student/cv']}>
        <Routes>
          <Route path="/student/cv" element={<StudentCVPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: '2. Complète ton CV' }, { timeout: 5000 });
  return screen.getByText('Photo').closest('div.flex.items-start') as HTMLElement;
}

function photoInput(): HTMLInputElement {
  return document.querySelector('input[name="cv-photo"]') as HTMLInputElement;
}

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
  api.put.mockReset();
  api.delete.mockReset();
  toast.error.mockReset();
  toast.success.mockReset();
});

describe('Photo du CV', () => {
  it('avec une photo de profil : case « Afficher ma photo de profil » cochée, vignette chargée une fois', async () => {
    serve(draft({ source: 'PROFILE', profilePhotoAvailable: true, key: 'p1' }, true));
    const field = await renderBuilder();

    const box = within(field).getByRole('checkbox', { name: 'Afficher ma photo de profil' }) as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(within(field).getByRole('button', { name: 'Changer la photo' })).toBeTruthy();
    expect(within(field).queryByRole('button', { name: 'Ajouter une photo' })).toBeNull();
    expect(within(field).queryByRole('button', { name: 'Revenir à ma photo de profil' })).toBeNull();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    expect(api.get.mock.calls.filter(([url]) => url === '/cv/builder/me/photo')).toHaveLength(1);
  });

  it('sans photo : « Ajouter une photo », pas de case à cocher, aucune image demandée', async () => {
    serve(draft({ source: 'NONE', profilePhotoAvailable: false, key: null }, false));
    const field = await renderBuilder();

    expect(within(field).queryByRole('checkbox')).toBeNull();
    expect(within(field).getByRole('button', { name: 'Ajouter une photo' })).toBeTruthy();
    expect(api.get.mock.calls.some(([url]) => url === '/cv/builder/me/photo')).toBe(false);
  });

  it('choisir un fichier : GIF ou plus de 5 Mo refusés ; un JPEG ouvre le recadrage', async () => {
    serve(draft({ source: 'NONE', profilePhotoAvailable: false, key: null }, false));
    await renderBuilder();

    fireEvent.change(photoInput(), { target: { files: [new File(['gif'], 'photo.gif', { type: 'image/gif' })] } });
    expect(toast.error).toHaveBeenLastCalledWith('Seules les photos JPEG ou PNG sont acceptées.');
    expect(screen.queryByRole('dialog')).toBeNull();

    const big = new File(['x'], 'grosse.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
    fireEvent.change(photoInput(), { target: { files: [big] } });
    expect(toast.error).toHaveBeenLastCalledWith('La photo dépasse 5 Mo : choisis-en une plus légère.');
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.change(photoInput(), { target: { files: [new File(['jpeg'], 'moi.jpg', { type: 'image/jpeg' })] } });
    const dialog = await screen.findByRole('dialog', { name: 'Recadre ta photo' });
    expect(within(dialog).getByRole('button', { name: 'Enregistrer la photo' })).toBeTruthy();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Annuler' })[0]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('photo propre au CV : « Revenir à ma photo de profil » la retire et l’aperçu est recalculé', async () => {
    serve(draft({ source: 'CV', profilePhotoAvailable: true, key: 'c1' }, true));
    api.delete.mockResolvedValue({ data: { data: { source: 'PROFILE', profilePhotoAvailable: true, key: 'p1' } } });
    const field = await renderBuilder();
    expect(within(field).getByRole('checkbox', { name: 'Afficher ma photo sur le CV' })).toBeTruthy();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    const previewsBefore = api.post.mock.calls.filter(([url]) => url === '/cv/builder/me/preview').length;

    fireEvent.click(within(field).getByRole('button', { name: 'Revenir à ma photo de profil' }));

    expect(await within(field).findByRole('checkbox', { name: 'Afficher ma photo de profil' })).toBeTruthy();
    expect(api.delete).toHaveBeenCalledWith('/cv/builder/me/photo');
    expect(toast.success).toHaveBeenCalledWith('Ton CV reprend ta photo de profil.');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    expect(api.post.mock.calls.filter(([url]) => url === '/cv/builder/me/preview').length).toBeGreaterThan(previewsBefore);
  });

  it('Linéaire : cadre carré ; on envoie la photo d’origine et la zone choisie, pas une image recadrée', async () => {
    serve(draft({ source: 'NONE', profilePhotoAvailable: false, key: null }, false, 'LINEAIRE'));
    await renderBuilder();
    const original = new File(['jpeg'], 'moi.jpg', { type: 'image/jpeg' });
    fireEvent.change(photoInput(), { target: { files: [original] } });
    const dialog = await screen.findByRole('dialog', { name: 'Recadre ta photo' });
    const frame = within(dialog).getByRole('img', { name: /Cadre de la photo/ });
    expect(frame.style.width).toBe('240px');
    expect(frame.style.height).toBe('240px');

    // Photo portrait 1000 x 1200 : centrée dans le cadre carré.
    const image = frame.querySelector('img') as HTMLImageElement;
    Object.defineProperty(image, 'naturalWidth', { value: 1000 });
    Object.defineProperty(image, 'naturalHeight', { value: 1200 });
    fireEvent.load(image);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer la photo' }));

    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    const call = api.post.mock.calls.find(([url]) => url === '/cv/builder/me/photo');
    expect(call).toBeTruthy();
    const form = call![1] as FormData;
    expect(form.get('file')).toBe(original);
    expect(Number(form.get('x'))).toBeCloseTo(0);
    expect(Number(form.get('y'))).toBeCloseTo(100 / 1200);
    expect(Number(form.get('width'))).toBeCloseTo(1);
    expect(Number(form.get('height'))).toBeCloseTo(1000 / 1200);
    expect(toast.success).toHaveBeenCalledWith('Photo enregistrée pour ton CV. Ta photo de profil ne change pas.');
  });

  it('autres modèles : cadre portrait 5:6, vignette demandée au format du modèle', async () => {
    serve(draft({ source: 'PROFILE', profilePhotoAvailable: true, key: 'p1' }, true, 'BANDEAU'));
    await renderBuilder();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    const photoCall = api.get.mock.calls.find(([url]) => url === '/cv/builder/me/photo');
    expect(photoCall?.[1]).toMatchObject({ params: { template: 'BANDEAU' } });
    fireEvent.change(photoInput(), { target: { files: [new File(['jpeg'], 'moi.jpg', { type: 'image/jpeg' })] } });
    const frame = within(await screen.findByRole('dialog', { name: 'Recadre ta photo' })).getByRole('img', { name: /Cadre de la photo/ });
    expect(frame.style.width).toBe('240px');
    expect(frame.style.height).toBe('288px');
  });

  it('noms des modèles : « (optimisé ATS) » sur les cartes', async () => {
    serve(draft(undefined, false));
    await renderBuilder();
    for (const name of ['Linéaire', 'Classique', 'Moderne', 'Bandeau']) {
      expect(screen.getByRole('button', { name: new RegExp(`${name} \\(optimisé ATS\\)`) })).toBeTruthy();
    }
  });
});

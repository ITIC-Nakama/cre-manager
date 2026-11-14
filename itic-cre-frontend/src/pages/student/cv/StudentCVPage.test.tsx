/**
 * « Mon CV » : la page s'affiche une fois et n'appelle chaque endpoint qu'une fois, avec ou sans CV.
 *
 * Bug reproduit (prod, 13/11/2026) : sans CV déposé, GET /cv/me répond 404. Traité comme une erreur, il faisait
 * repasser la requête « en chargement » à chaque nouvel abonné : la page affichait son squelette, démontait
 * l'assistant, qui se remontait et relançait GET /cv/me… (55 requêtes en 6 s en prod, 217 en local).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StudentCVPage from './StudentCVPage';
import type { CVResponse } from '../../../types/models/CV';
import type { CvDraftData, CvDraftResponse } from '../../../types/models/CVBuilder';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('../../../api-s/AxiosApiClient', () => ({ apiClient: api, registerForceLogoutHandler: () => {}, resetSessionState: () => {} }));

type Reply = unknown | { status: number };
const notFound = { status: 404 };

/** Réponses de l'API pour un scénario ; une réponse { status } est renvoyée comme une erreur axios. */
function serve(routes: Record<string, Reply>) {
  const reply = (url: string) => {
    if (!(url in routes)) return Promise.reject({ response: { status: 500 } });
    const value = routes[url];
    if (value && typeof value === 'object' && 'status' in value) {
      return Promise.reject({ response: { status: (value as { status: number }).status, data: { statusCode: (value as { status: number }).status } } });
    }
    return Promise.resolve({ data: { data: value } });
  };
  api.get.mockImplementation((url: string) => reply(`GET ${url}`));
  api.post.mockImplementation((url: string) => (url === '/cv/builder/me/preview'
    ? Promise.resolve({ data: '<html><body>Aperçu du CV</body></html>' })
    : reply(`POST ${url}`)));
  api.put.mockImplementation((url: string) => reply(`PUT ${url}`));
}

/** Nombre d'appels GET par endpoint. */
function getCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [url] of api.get.mock.calls) counts[url as string] = (counts[url as string] ?? 0) + 1;
  return counts;
}

function draftData(overrides: Partial<CvDraftData> = {}): CvDraftData {
  return {
    identite: {
      prenom: 'Nora', nom: 'Petitjean', titre: '', email: 'nora.petitjean@example.com', telephone: '0600000000',
      ville: '', mobilite: '', liens: [], afficherPhoto: false,
    },
    accroche: '',
    experiences: [],
    formations: [{
      id: 'f1', diplome: 'Bachelor RH 2026-2027', etablissement: 'ITIC Paris', ville: 'Paris', debut: '2026-09',
      fin: '', enCours: true, mention: '', points: [],
    }],
    projets: [],
    competences: { techniques: [], outils: [], savoirEtre: [] },
    langues: [],
    certifications: [],
    centresInteret: [],
    ordreSections: ['formations', 'experiences', 'projets', 'competences', 'langues', 'certifications', 'centresInteret'],
    ordrePersonnalise: false,
    sectionsMasquees: [],
    ...overrides,
  };
}

function draft(saved: boolean, data = draftData()): CvDraftResponse {
  return {
    data, templateCode: 'CLASSIQUE', accentColor: '#3B71FF', cvLang: 'fr', version: saved ? 3 : null, saved,
    updatedAt: saved ? '2026-11-13T10:00:00Z' : null, lastSubmittedAt: null,
  };
}

function cv(source: 'UPLOAD' | 'BUILDER', statut = { nom: 'En attente', code: null, ordre: 1 }): CVResponse {
  return {
    id: 'cv1', url: 'https://example.com/cvs/cv.pdf', nomFichier: 'CV_Petitjean_Nora.pdf', uploadedAt: '2026-11-10T09:00:00Z',
    updatedAt: null, xpAwarded: false, studentId: 's1', source, templateCode: source === 'BUILDER' ? 'CLASSIQUE' : null,
    statut: { id: 'st1', couleur: '#3B71FF', actif: true, gainXP: 50, ...statut },
  } as CVResponse;
}

const score = { score: 40, pageCount: 1, tips: [] };

function renderAt(path: string) {
  // Mêmes réglages par défaut que l'application (queryClient.ts) : 3 nouveaux essais, données fraîches 30 s.
  const client = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 3, staleTime: 30_000 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/student/cv" element={<StudentCVPage />} />
          <Route path="/student/cv/assistant" element={<StudentCVPage mode="builder" />} />
          <Route path="/student/cv/depot" element={<StudentCVPage mode="upload" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Laisse tourner l'application : une boucle de remontage ferait des dizaines d'appels pendant ce temps. */
async function settle(ms = 1500) {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
}

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
  api.put.mockReset();
});

describe('Mon CV', () => {
  it('étudiant sans CV ni brouillon : la page s’affiche et chaque endpoint n’est appelé qu’une fois', async () => {
    serve({
      'GET /cv/me': notFound,
      'GET /cv/me/comments': notFound,
      'GET /cv/builder/me': draft(false),
      'GET /cv/builder/me/score': score,
    });
    renderAt('/student/cv');

    expect(await screen.findByRole('heading', { name: '1. Choisis un modèle' }, { timeout: 5000 })).toBeTruthy();
    await settle();

    expect(screen.getByRole('button', { name: /Créer avec un modèle ITIC/ }).getAttribute('aria-current')).toBe('page');
    expect(screen.queryByText(/Impossible de charger/)).toBeNull();
    const counts = getCounts();
    expect(counts['/cv/me']).toBe(1);
    expect(counts['/cv/builder/me']).toBe(1);
    expect(counts['/cv/me/comments'] ?? 0).toBe(0); // pas de CV : pas de commentaires à demander
    Object.entries(counts).forEach(([url, n]) => expect(n, url).toBeLessThanOrEqual(1));

    // « Déposer un fichier » reste utilisable, sans nouvel appel à /cv/me.
    fireEvent.click(screen.getByRole('button', { name: 'Déposer un fichier' }));
    await settle(500);
    expect(document.querySelector('input[type=file]')).not.toBeNull();
    expect(getCounts()['/cv/me']).toBe(1);
  });

  it('API à jour : sans CV, GET /cv/me répond 204 (corps vide) et les commentaires [] — même résultat', async () => {
    serve({
      'GET /cv/builder/me': draft(false, draftData({
        experiences: [{
          id: 'e1', poste: 'Assistant RH en alternance', entreprise: 'Entreprise Recette', ville: '', typeContrat: 'Alternance',
          debut: '2026-09', fin: null, enCours: true, points: [], aConfirmer: true,
        }],
      })),
      'GET /cv/builder/me/score': score,
      'GET /cv/me/comments': [],
    });
    const base = api.get.getMockImplementation()!;
    api.get.mockImplementation((url: string) => (url === '/cv/me' ? Promise.resolve({ data: '' }) : base(url)));
    renderAt('/student/cv');

    expect(await screen.findByRole('heading', { name: '1. Choisis un modèle' }, { timeout: 5000 })).toBeTruthy();
    await settle();
    expect(screen.getByRole('button', { name: /Créer avec un modèle ITIC/ }).getAttribute('aria-current')).toBe('page');
    const counts = getCounts();
    expect(counts['/cv/me']).toBe(1);
    expect(counts['/cv/me/comments'] ?? 0).toBe(0);
    Object.entries(counts).forEach(([url, n]) => expect(n, url).toBeLessThanOrEqual(1));
  });

  it('a déjà déposé un fichier : « Mon CV » ouvre quand même l’onglet modèle, le dépôt est à un clic', async () => {
    serve({
      'GET /cv/me': cv('UPLOAD'),
      'GET /cv/me/comments': [],
      'GET /cv/builder/me': draft(false),
      'GET /cv/builder/me/score': score,
    });
    renderAt('/student/cv');

    expect(await screen.findByRole('heading', { name: '1. Choisis un modèle' }, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Créer avec un modèle ITIC/ }).getAttribute('aria-current')).toBe('page');
    await settle(500);
    Object.entries(getCounts()).forEach(([url, n]) => expect(n, url).toBeLessThanOrEqual(1));

    fireEvent.click(screen.getByRole('button', { name: 'Déposer un fichier' }));
    expect(await screen.findByText('Remplacer mon CV', {}, { timeout: 5000 })).toBeTruthy();
  });

  it('lien direct /student/cv/depot : l’onglet dépôt et la fiche du CV déposé, un appel par endpoint', async () => {
    serve({
      'GET /cv/me': cv('UPLOAD'),
      'GET /cv/me/comments': [],
    });
    renderAt('/student/cv/depot');

    expect(await screen.findByText('Remplacer mon CV', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Déposer un fichier' }).getAttribute('aria-current')).toBe('page');
    await settle();
    const counts = getCounts();
    expect(counts['/cv/me']).toBe(1);
    expect(counts['/cv/me/comments']).toBe(1);
    Object.entries(counts).forEach(([url, n]) => expect(n, url).toBeLessThanOrEqual(1));
  });

  it('CV de l’assistant sans brouillon enregistré : l’assistant s’ouvre, un appel par endpoint', async () => {
    serve({
      'GET /cv/me': cv('BUILDER'),
      'GET /cv/me/comments': [],
      'GET /cv/builder/me': draft(false),
      'GET /cv/builder/me/score': score,
    });
    renderAt('/student/cv');

    expect(await screen.findByRole('heading', { name: '2. Complète ton CV' }, { timeout: 5000 })).toBeTruthy();
    await settle();
    Object.entries(getCounts()).forEach(([url, n]) => expect(n, url).toBeLessThanOrEqual(1));
  });

  it('étudiant sous contrat (expérience proposée, CV à corriger) : la page s’affiche, un appel par endpoint', async () => {
    serve({
      'GET /cv/me': cv('BUILDER', { nom: 'À corriger', code: 'A_CORRIGER', ordre: 3 } as never),
      'GET /cv/me/comments': [{ id: 'c1', contenu: 'Ajoute tes réalisations en alternance.', createdAt: '2026-11-12T10:00:00Z' }],
      'GET /cv/builder/me': draft(true, draftData({
        experiences: [{
          id: 'e1', poste: 'Chargée RH en alternance', entreprise: 'Entreprise Démo', ville: 'Paris', typeContrat: 'Alternance',
          debut: '2026-09', fin: null, enCours: true, points: [], aConfirmer: true,
        }],
      })),
      'GET /cv/builder/me/score': score,
    });
    renderAt('/student/cv');

    expect(await screen.findByText('Ajoute tes réalisations en alternance.', {}, { timeout: 5000 })).toBeTruthy();
    await settle();
    expect(screen.getByRole('heading', { name: '1. Choisis un modèle' })).toBeTruthy();
    Object.entries(getCounts()).forEach(([url, n]) => expect(n, url).toBeLessThanOrEqual(1));
  });
});
